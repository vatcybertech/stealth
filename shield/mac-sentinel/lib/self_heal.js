// SHIELD Mac Sentinel — self-healing hardening verifier.
//
// Runs on its own timer (default 5 minutes) and independently of the
// main scan loop. On every tick it verifies the user's declared
// hardening baseline: which macOS security features the user intends
// to be ON. For anything that has drifted from that baseline, it:
//
//   - Writes a HARDENING_DRIFT event to the ledger (HIGH or CRITICAL)
//   - For items it CAN restore programmatically, attempts a restore
//     and writes HARDENING_RESTORED on success
//   - For items Apple blocks programmatic re-enable on (Lockdown
//     Mode, FileVault, SIP), logs loudly and fires the auto-response
//     engine directly
//
// Programmatically-restorable items:
//   - Firewall             socketfilterfw --setglobalstate on
//   - Firewall stealth     socketfilterfw --setstealthmode on
//   - Gatekeeper           spctl --master-enable
//   - Sharing services     launchctl disable system/<service>
//
// Irreversibly-user-gated items (alert only):
//   - Lockdown Mode        user must re-enable from Settings
//   - FileVault            user must re-enable from Settings
//   - SIP                  requires recovery-mode boot
//
// All restore operations require the sudoers rule from
// install-sudoers.sh. Without it, we still detect drift but cannot
// restore it.

'use strict';

const { run } = require('./shell');
const { nowIso } = require('./crypto');

class SelfHeal {
  /**
   * @param {object} ctx
   * @param {function} ctx.append           ledger.append
   * @param {object}   ctx.integrityCollector  integrity collector module
   * @param {object}   ctx.sharingCollector    sharing collector module
   * @param {function} ctx.fireAutoResponse (event) => Promise<void>
   * @param {object}   ctx.config          self-heal config from defaults.json
   */
  constructor(ctx) {
    this.append = ctx.append;
    this.integrityCollector = ctx.integrityCollector;
    this.sharingCollector = ctx.sharingCollector;
    this.fireAutoResponse = ctx.fireAutoResponse;
    this.config = ctx.config || {};
    this.intervalMs = this.config.intervalMs || 5 * 60 * 1000;
    this.baseline = this.config.baseline || {
      lockdownMode: true,
      fileVault: true,
      sip: true,
      gatekeeper: true,
      firewall: true,
      firewallStealth: true,
      sharingServicesOff: true,
    };
    this.timer = null;
  }

  start() {
    if (this.timer) clearInterval(this.timer);
    // Run once on start, then every intervalMs.
    this.tick().catch(() => {});
    this.timer = setInterval(() => { this.tick().catch(() => {}); }, this.intervalMs);
    this.append('SELF_HEAL_STARTED', 'INFO', { intervalMs: this.intervalMs, baseline: this.baseline });
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  async tick() {
    const [integrity, sharing] = await Promise.all([
      this.integrityCollector.collect(),
      this.sharingCollector.collect(),
    ]);

    const drifts = [];
    const restored = [];

    // Lockdown Mode — alert only
    if (this.baseline.lockdownMode && integrity.lockdownMode?.enabled === false) {
      drifts.push({ item: 'lockdownMode', expected: true, actual: false, restorable: false });
    }
    // FileVault — alert only
    if (this.baseline.fileVault && integrity.fileVault?.enabled === false) {
      drifts.push({ item: 'fileVault', expected: true, actual: false, restorable: false });
    }
    // SIP — alert only
    if (this.baseline.sip && integrity.sip?.enabled === false) {
      drifts.push({ item: 'sip', expected: true, actual: false, restorable: false });
    }
    // Gatekeeper — attempt restore
    if (this.baseline.gatekeeper && integrity.gatekeeper?.enabled === false) {
      const d = { item: 'gatekeeper', expected: true, actual: false, restorable: true };
      drifts.push(d);
      const r = await run('/usr/bin/sudo', ['-n', '/usr/sbin/spctl', '--master-enable'], { timeout: 5000 });
      if (r.code === 0) { restored.push('gatekeeper'); d.restored = true; }
      else d.restoreError = r.stderr?.slice(0, 300);
    }
    // Firewall — attempt restore
    if (this.baseline.firewall && integrity.firewall?.enabled === false) {
      const d = { item: 'firewall', expected: true, actual: false, restorable: true };
      drifts.push(d);
      const r = await run('/usr/bin/sudo', ['-n', '/usr/libexec/ApplicationFirewall/socketfilterfw', '--setglobalstate', 'on'], { timeout: 5000 });
      if (r.code === 0) { restored.push('firewall'); d.restored = true; }
      else d.restoreError = r.stderr?.slice(0, 300);
    }
    if (this.baseline.firewallStealth && integrity.firewall?.stealth === false) {
      const d = { item: 'firewallStealth', expected: true, actual: false, restorable: true };
      drifts.push(d);
      const r = await run('/usr/bin/sudo', ['-n', '/usr/libexec/ApplicationFirewall/socketfilterfw', '--setstealthmode', 'on'], { timeout: 5000 });
      if (r.code === 0) { restored.push('firewallStealth'); d.restored = true; }
      else d.restoreError = r.stderr?.slice(0, 300);
    }
    // Sharing services — attempt disable
    if (this.baseline.sharingServicesOff && sharing.active && sharing.active.length > 0) {
      for (const svc of sharing.active) {
        const d = { item: 'sharing', service: svc.label, underlying: svc.svc, expected: 'off', actual: 'running', restorable: true };
        drifts.push(d);
        const r = await run('/usr/bin/sudo', ['-n', '/bin/launchctl', 'disable', `system/${svc.svc}`], { timeout: 5000 });
        if (r.code === 0) { restored.push('sharing:' + svc.svc); d.restored = true; }
        else d.restoreError = r.stderr?.slice(0, 300);
      }
    }

    if (drifts.length === 0) {
      // Quiet success — log as INFO on the first successful run only,
      // and every 20 ticks thereafter to avoid flooding the ledger.
      this._tickCount = (this._tickCount || 0) + 1;
      if (this._tickCount === 1 || this._tickCount % 20 === 0) {
        this.append('SELF_HEAL_CLEAN', 'INFO', { tick: this._tickCount, baseline: this.baseline });
      }
      return;
    }

    // Any unresolved drift is HIGH. Any non-restorable drift is CRITICAL.
    const nonRestorable = drifts.filter(d => !d.restorable);
    const severity = nonRestorable.length > 0 ? 'CRITICAL' : 'HIGH';
    this.append('HARDENING_DRIFT', severity, {
      drifts,
      restored,
      message: severity === 'CRITICAL'
        ? `Hardening drift detected on non-restorable item(s): ${nonRestorable.map(d => d.item).join(', ')}. User action required immediately.`
        : `Hardening drift detected and ${restored.length > 0 ? 'partially restored' : 'cannot be restored without the sudoers rule'}.`,
    });
    if (restored.length > 0) {
      this.append('HARDENING_RESTORED', 'HIGH', { restored });
    }
    // Fire the auto-response engine on non-restorable CRITICAL drift.
    if (nonRestorable.length > 0 && this.fireAutoResponse) {
      try {
        await this.fireAutoResponse({
          id: null,
          type: 'HARDENING_DRIFT',
          severity: 'CRITICAL',
          payload: { drifts: nonRestorable },
        });
      } catch {}
    }
  }
}

module.exports = SelfHeal;
