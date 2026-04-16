// SHIELD Mac Sentinel — auto-response engine.
//
// When a CRITICAL event fires AND the Mac screen is locked (meaning
// the user is presumably asleep or away and cannot react in time),
// the auto-response engine will:
//
//   1. Disable Wi-Fi via `networksetup -setairportpower <iface> off`
//   2. Play an audible alarm via `afplay /System/Library/Sounds/Sosumi.aiff`
//   3. Display a dialog via `osascript -e 'display alert ...'`
//      (visible to the user on unlock)
//   4. Log an AUTO_RESPONSE_FIRED CRITICAL event to the ledger
//   5. Persist a "pending acknowledgement" state to disk
//
// The engine will NOT auto-respond again until the user explicitly
// acknowledges the previous auto-response via the PWA (POST
// /acknowledge → re-enables Wi-Fi, clears pending flag).
//
// Grace period: for the first 72 hours after install, auto-response
// is disabled so that early false-positives during collector baseline
// establishment don't disrupt the user's life. After that it arms.
//
// Configurability: every individual action (killWifi / alarm / alert)
// can be toggled independently in config/defaults.json → autoResponse.

'use strict';

const fs = require('fs');
const path = require('path');
const { run } = require('./shell');
const { nowIso } = require('./crypto');

class AutoResponseEngine {
  /**
   * @param {object} ctx
   * @param {object} ctx.config       the autoResponse block from config
   * @param {string} ctx.stateFile    path to persisted state file
   * @param {function} ctx.append     ledger.append bound function
   * @param {number} ctx.installedAt  ms since epoch when SHIELD was installed
   */
  constructor(ctx) {
    this.config = ctx.config || {};
    this.stateFile = ctx.stateFile;
    this.append = ctx.append;
    this.installedAt = ctx.installedAt || Date.now();
    this._loadState();
  }

  _loadState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        this._state = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
        return;
      }
    } catch {}
    this._state = {
      pending: false,
      firedAt: null,
      lastEventId: null,
      wifiKilled: false,
      disabledInterface: null,
    };
    this._saveState();
  }

  _saveState() {
    try {
      const dir = path.dirname(this.stateFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      fs.writeFileSync(this.stateFile, JSON.stringify(this._state, null, 2), { mode: 0o600 });
    } catch (err) {
      console.error('[auto_response] failed to persist state:', err.message);
    }
  }

  /**
   * Has the grace period elapsed?
   */
  armed() {
    const graceSec = this.config.gracePeriodSeconds ?? (72 * 3600);
    return (Date.now() - this.installedAt) >= graceSec * 1000;
  }

  /**
   * Is a previous auto-response still awaiting user acknowledgement?
   */
  get isPending() { return !!this._state.pending; }
  get state() { return { ...this._state }; }

  /**
   * Query macOS for the current screen-lock state.
   * Uses the frontmost application check: when the screen is locked,
   * `loginwindow` is the frontmost process. This is the most reliable
   * check that works without additional entitlements or Python.
   *
   * Returns { locked: bool, reason: string }
   */
  async isScreenLocked() {
    // Primary check: frontmost application
    const a = await run(
      '/usr/bin/osascript',
      ['-e', 'tell application "System Events" to get name of first application process whose frontmost is true'],
      { timeout: 3500 },
    );
    if (a.code === 0) {
      const frontmost = (a.stdout || '').trim();
      if (/loginwindow/i.test(frontmost)) return { locked: true, reason: 'loginwindow-frontmost' };
    }
    // Secondary check: ioreg query for CGSSessionScreenIsLocked
    const b = await run('/usr/sbin/ioreg', ['-n', 'Root', '-d', '1', '-a'], { timeout: 4000 });
    if (b.code === 0 && /CGSSessionScreenIsLocked[\s\S]*?<true\/>/.test(b.stdout)) {
      return { locked: true, reason: 'ioreg-session-locked' };
    }
    // Tertiary: idle time (if idle > 10 min assume locked even if we can't prove it)
    const c = await run('/usr/sbin/ioreg', ['-n', 'IOHIDSystem'], { timeout: 3500 });
    const m = c.stdout && c.stdout.match(/HIDIdleTime"\s*=\s*(\d+)/);
    if (m) {
      const idleNs = parseInt(m[1], 10);
      const idleMin = idleNs / 1e9 / 60;
      if (idleMin > 10) return { locked: true, reason: 'idle-' + Math.round(idleMin) + 'min' };
    }
    return { locked: false, reason: 'active' };
  }

  /**
   * Fire the auto-response sequence. Idempotent — if already pending,
   * log that we tried and return.
   */
  async fire(criticalEvent) {
    if (!this.config.enabled) {
      this.append('AUTO_RESPONSE_SKIPPED', 'INFO', { reason: 'disabled-in-config', criticalType: criticalEvent?.type });
      return { fired: false, reason: 'disabled' };
    }
    if (!this.armed()) {
      this.append('AUTO_RESPONSE_SKIPPED', 'INFO', { reason: 'grace-period', criticalType: criticalEvent?.type });
      return { fired: false, reason: 'grace-period' };
    }
    if (this._state.pending) {
      this.append('AUTO_RESPONSE_SKIPPED', 'INFO', { reason: 'already-pending', criticalType: criticalEvent?.type });
      return { fired: false, reason: 'already-pending' };
    }
    if (this.config.onlyWhenScreenLocked) {
      const lockState = await this.isScreenLocked();
      if (!lockState.locked) {
        this.append('AUTO_RESPONSE_SKIPPED', 'INFO', { reason: 'screen-unlocked-user-present', criticalType: criticalEvent?.type, lockState });
        return { fired: false, reason: 'screen-unlocked' };
      }
    }

    const actions = { killWifi: null, alarm: null, alert: null };
    let disabledInterface = null;

    // Action 1: kill Wi-Fi
    if (this.config.killWifi) {
      try {
        // Find the Wi-Fi device name first — typically en0 or en1.
        const ns = await run('/usr/sbin/networksetup', ['-listallhardwareports'], { timeout: 4000 });
        const blocks = (ns.stdout || '').split(/\n\s*\n/);
        let wifiDev = null;
        for (const b of blocks) {
          if (/Wi-?Fi/i.test(b)) {
            const m = b.match(/Device:\s*(\S+)/);
            if (m) { wifiDev = m[1]; break; }
          }
        }
        if (!wifiDev) {
          actions.killWifi = { ok: false, reason: 'wifi-device-not-found' };
        } else {
          const kill = await run('/usr/sbin/networksetup', ['-setairportpower', wifiDev, 'off'], { timeout: 5000 });
          if (kill.code === 0) {
            actions.killWifi = { ok: true, device: wifiDev };
            disabledInterface = wifiDev;
          } else {
            actions.killWifi = { ok: false, reason: 'networksetup-failed', stderr: kill.stderr };
          }
        }
      } catch (err) {
        actions.killWifi = { ok: false, reason: 'exception', message: err.message };
      }
    }

    // Action 2: audible alarm. Loop 5 plays of the system alert sound.
    if (this.config.audibleAlarm) {
      try {
        // afplay is blocking; run five sequential plays in the background so
        // we do not hold up the server.
        const child = require('child_process').spawn(
          '/bin/bash',
          ['-c', 'for i in 1 2 3 4 5; do /usr/bin/afplay /System/Library/Sounds/Sosumi.aiff; done'],
          { detached: true, stdio: 'ignore' },
        );
        child.unref();
        actions.alarm = { ok: true };
      } catch (err) {
        actions.alarm = { ok: false, message: err.message };
      }
    }

    // Action 3: user-facing alert dialog (visible when user unlocks).
    if (this.config.alertDialog) {
      try {
        const msg = `CRITICAL event: ${criticalEvent?.type || 'unknown'}. Wi-Fi has been disabled. Open SHIELD and acknowledge to re-enable.`;
        const scriptPath = '/usr/bin/osascript';
        const script = `display alert "SHIELD — CRITICAL" message "${msg.replace(/"/g, '\\"')}" as critical giving up after 3600`;
        const child = require('child_process').spawn(scriptPath, ['-e', script], { detached: true, stdio: 'ignore' });
        child.unref();
        actions.alert = { ok: true };
      } catch (err) {
        actions.alert = { ok: false, message: err.message };
      }
    }

    this._state = {
      pending: true,
      firedAt: nowIso(),
      lastEventId: criticalEvent?.id || null,
      lastEventType: criticalEvent?.type || null,
      wifiKilled: !!(actions.killWifi && actions.killWifi.ok),
      disabledInterface,
    };
    this._saveState();

    this.append('AUTO_RESPONSE_FIRED', 'CRITICAL', {
      trigger: { type: criticalEvent?.type, severity: criticalEvent?.severity, id: criticalEvent?.id },
      actions,
      message: 'SHIELD auto-response triggered while screen was locked. Wi-Fi disabled, alarm played, dialog queued. User acknowledgement required to re-enable Wi-Fi.',
    });

    return { fired: true, actions };
  }

  /**
   * User acknowledges the auto-response via the PWA.
   * Re-enables Wi-Fi (if we killed it) and clears pending state.
   */
  async acknowledge() {
    if (!this._state.pending) {
      return { acknowledged: false, reason: 'not-pending' };
    }
    const out = { wifi: null };
    if (this._state.wifiKilled && this._state.disabledInterface) {
      try {
        const up = await run('/usr/sbin/networksetup', ['-setairportpower', this._state.disabledInterface, 'on'], { timeout: 5000 });
        out.wifi = up.code === 0 ? { ok: true } : { ok: false, stderr: up.stderr };
      } catch (err) {
        out.wifi = { ok: false, message: err.message };
      }
    }
    const prev = { ...this._state };
    this._state = {
      pending: false,
      firedAt: null,
      lastEventId: null,
      lastEventType: null,
      wifiKilled: false,
      disabledInterface: null,
    };
    this._saveState();

    this.append('AUTO_RESPONSE_ACKNOWLEDGED', 'HIGH', {
      prev,
      restored: out,
      message: 'User acknowledged the auto-response. Wi-Fi re-enabled.',
    });
    return { acknowledged: true, restored: out };
  }
}

module.exports = AutoResponseEngine;
