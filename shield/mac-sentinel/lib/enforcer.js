// SHIELD Mac Sentinel — auto-enforcement engine.
//
// Every other module in SHIELD is detection. The ledger fills up with
// events, the user sees them, the user reacts. This module is the
// enforcement layer: when a specific class of event fires and the
// enforcement policy permits it, SHIELD takes corrective action
// WITHOUT waiting for a human to look at a dashboard.
//
// Design principles:
//
//   1. 72-hour grace period after install. In DRY_RUN mode, every
//      action is logged as "would have been taken" but not executed.
//      After 72h, the engine flips to ENFORCE mode automatically.
//      Operators can explicitly set the mode in config/defaults.json.
//
//   2. Conservative defaults. Actions with irreversible blast radius
//      (killing a root process, removing an Apple-signed LaunchAgent,
//      restoring /etc/hosts) are either skipped or require root via
//      a tightly-scoped sudoers rule (see docs/ENFORCEMENT.md).
//
//   3. Idempotent and auditable. Every action emits TWO ledger
//      entries: ENFORCEMENT_PLANNED before execution and
//      ENFORCEMENT_RESULT after, with the action, target, exit code,
//      and stderr captured.
//
//   4. Disable switch. The entire engine can be turned off with a
//      single config flag. DRY_RUN mode never executes anything.
//
// Supported enforcement actions:
//
//   quarantineLaunchAgent(path)
//       Move the plist to ~/Library/Application Support/SHIELD/quarantine/
//       with a timestamp, and `launchctl unload` the original label.
//       User-level — no root required.
//
//   removeProfile(identifier)
//       `sudo profiles remove -identifier <id>`. Requires sudoers rule.
//
//   disableSharingService(serviceLabel)
//       `sudo launchctl disable system/<label>`. Requires sudoers rule.
//
//   killProcess(pid, reason)
//       `kill -9 <pid>`. Only allowed if the process is user-owned
//       AND unsigned AND has outbound connections AND is NOT on a
//       conservative whitelist (node, python, go, cargo, brew, etc.).
//
//   restoreHostsFile()
//       Requires a baseline /etc/hosts snapshot taken at setup time.
//       `sudo cp <baseline> /etc/hosts` via sudoers rule.
//
//   restoreShellRc(path)
//       Restore from ~/Library/Application Support/SHIELD/baselines/
//       which is populated at setup. User-level.

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { run } = require('./shell');
const { nowIso } = require('./crypto');

const USER_WHITELIST_COMMANDS = new Set([
  'node', 'python', 'python3', 'python2', 'ruby', 'perl',
  'go', 'cargo', 'rustc', 'java', 'javac', 'mvn', 'gradle',
  'brew', 'git', 'gh', 'docker', 'colima', 'terraform', 'ansible',
  'npm', 'yarn', 'pnpm', 'bun', 'deno',
  'code', 'cursor', 'vim', 'nvim', 'emacs',
]);

class Enforcer {
  /**
   * @param {object} ctx
   * @param {object} ctx.config        enforcement block from config/defaults.json
   * @param {function} ctx.append      ledger.append bound function
   * @param {number} ctx.installedAt   ms since epoch when SHIELD was installed
   * @param {string} ctx.stateDir      SHIELD state dir (for quarantine + baselines)
   */
  constructor(ctx) {
    this.config = ctx.config || {};
    this.append = ctx.append;
    this.installedAt = ctx.installedAt || Date.now();
    this.stateDir = ctx.stateDir;
    this.quarantineDir = path.join(this.stateDir, 'quarantine');
    this.baselineDir = path.join(this.stateDir, 'baselines');
    this._ensureDirs();
  }

  _ensureDirs() {
    for (const d of [this.quarantineDir, this.baselineDir]) {
      try { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true, mode: 0o700 }); } catch {}
    }
  }

  /**
   * Current operating mode: 'DISABLED' | 'DRY_RUN' | 'ENFORCE'.
   * - DISABLED: do nothing, not even log planned actions
   * - DRY_RUN:  log planned actions but do not execute (first 72h by default)
   * - ENFORCE:  execute actions
   */
  get mode() {
    if (this.config.enabled === false) return 'DISABLED';
    if (this.config.mode === 'enforce') return 'ENFORCE';
    if (this.config.mode === 'dryRun') return 'DRY_RUN';
    // Auto: DRY_RUN during grace period, then ENFORCE
    const graceSec = this.config.gracePeriodSeconds ?? (72 * 3600);
    const elapsedMs = Date.now() - this.installedAt;
    if (elapsedMs < graceSec * 1000) return 'DRY_RUN';
    return 'ENFORCE';
  }

  _plan(action, target, reason, details = {}) {
    const plan = {
      action,
      target,
      reason,
      mode: this.mode,
      plannedAt: nowIso(),
      ...details,
    };
    this.append('ENFORCEMENT_PLANNED', 'HIGH', plan);
    return plan;
  }

  _result(plan, outcome) {
    this.append('ENFORCEMENT_RESULT', outcome.ok ? 'HIGH' : 'CRITICAL', {
      ...plan,
      completedAt: nowIso(),
      outcome,
    });
  }

  // ─── Launch agent quarantine ─────────────────────────────────────
  async quarantineLaunchAgent(plistPath, labelHint = null) {
    const plan = this._plan('quarantineLaunchAgent', plistPath, 'new-or-modified-launch-agent', { labelHint });
    if (this.mode !== 'ENFORCE') return { ok: true, skipped: 'dryrun-or-disabled', plan };
    try {
      if (!fs.existsSync(plistPath)) {
        const result = { ok: false, reason: 'file-missing' };
        this._result(plan, result);
        return result;
      }
      // Attempt to read the label out of the plist so we can unload it.
      let label = labelHint;
      try {
        const txt = fs.readFileSync(plistPath, 'utf8');
        const m = txt.match(/<key>Label<\/key>\s*<string>([^<]+)<\/string>/);
        if (m) label = m[1];
      } catch {}
      if (label) {
        // Best effort: unload from user domain, ignore errors.
        await run('/bin/launchctl', ['unload', plistPath], { timeout: 5000 });
      }
      // Move to quarantine with timestamp.
      const ts = nowIso().replace(/[:.]/g, '-');
      const dest = path.join(this.quarantineDir, path.basename(plistPath) + '.' + ts + '.quarantined');
      fs.renameSync(plistPath, dest);
      const result = { ok: true, quarantineTo: dest, label };
      this._result(plan, result);
      return result;
    } catch (err) {
      const result = { ok: false, reason: 'exception', message: err.message };
      this._result(plan, result);
      return result;
    }
  }

  // ─── Configuration profile removal (requires sudoers rule) ──────
  async removeProfile(identifier) {
    const plan = this._plan('removeProfile', identifier, 'unauthorized-profile-installed');
    if (this.mode !== 'ENFORCE') return { ok: true, skipped: 'dryrun-or-disabled', plan };
    if (!identifier) return { ok: false, reason: 'no-identifier' };
    const res = await run('/usr/bin/sudo', ['-n', '/usr/bin/profiles', 'remove', '-identifier', identifier], { timeout: 10000 });
    const result = { ok: res.code === 0, stderr: res.stderr?.slice(0, 500), code: res.code };
    if (!result.ok && /password is required|sudo.*terminal/i.test(res.stderr || '')) {
      result.reason = 'sudoers-rule-missing';
      result.hint = 'Install the sudoers rule via mac-sentinel/install-sudoers.sh — see docs/ENFORCEMENT.md.';
    }
    this._result(plan, result);
    return result;
  }

  // ─── Sharing service disable (requires sudoers rule) ────────────
  async disableSharingService(serviceLabel) {
    const plan = this._plan('disableSharingService', serviceLabel, 'unauthorized-sharing-enabled');
    if (this.mode !== 'ENFORCE') return { ok: true, skipped: 'dryrun-or-disabled', plan };
    const res = await run('/usr/bin/sudo', ['-n', '/bin/launchctl', 'disable', `system/${serviceLabel}`], { timeout: 8000 });
    const result = { ok: res.code === 0, stderr: res.stderr?.slice(0, 500), code: res.code };
    this._result(plan, result);
    return result;
  }

  // ─── Process termination (conservative) ─────────────────────────
  async killProcess(pid, command, reason) {
    const plan = this._plan('killProcess', { pid, command }, reason);
    if (this.mode !== 'ENFORCE') return { ok: true, skipped: 'dryrun-or-disabled', plan };
    // Conservative gate: refuse to kill whitelisted dev commands.
    const baseCmd = (command || '').split('/').pop().split(' ')[0].toLowerCase();
    if (USER_WHITELIST_COMMANDS.has(baseCmd)) {
      const result = { ok: false, reason: 'command-on-dev-whitelist', baseCmd };
      this._result(plan, result);
      return result;
    }
    if (!pid || pid < 2) {
      const result = { ok: false, reason: 'invalid-pid' };
      this._result(plan, result);
      return result;
    }
    try {
      process.kill(pid, 'SIGKILL');
      const result = { ok: true, signal: 'SIGKILL' };
      this._result(plan, result);
      return result;
    } catch (err) {
      const result = { ok: false, reason: err.code || err.message };
      this._result(plan, result);
      return result;
    }
  }

  // ─── /etc/hosts restore (requires sudoers rule) ────────────────
  async restoreHostsFile() {
    const baseline = path.join(this.baselineDir, 'etc-hosts.baseline');
    const plan = this._plan('restoreHostsFile', '/etc/hosts', 'hosts-file-modified', { baseline });
    if (this.mode !== 'ENFORCE') return { ok: true, skipped: 'dryrun-or-disabled', plan };
    if (!fs.existsSync(baseline)) {
      const result = { ok: false, reason: 'no-baseline' };
      this._result(plan, result);
      return result;
    }
    const res = await run('/usr/bin/sudo', ['-n', '/bin/cp', baseline, '/etc/hosts'], { timeout: 5000 });
    const result = { ok: res.code === 0, stderr: res.stderr?.slice(0, 500) };
    this._result(plan, result);
    return result;
  }

  // ─── Shell RC restore (user-level, no sudo) ─────────────────────
  async restoreShellRc(rcPath) {
    const baselineName = 'shellrc-' + path.basename(rcPath);
    const baseline = path.join(this.baselineDir, baselineName);
    const plan = this._plan('restoreShellRc', rcPath, 'shell-rc-modified', { baseline });
    if (this.mode !== 'ENFORCE') return { ok: true, skipped: 'dryrun-or-disabled', plan };
    if (!fs.existsSync(baseline)) {
      const result = { ok: false, reason: 'no-baseline' };
      this._result(plan, result);
      return result;
    }
    try {
      // Copy the baseline over the tampered file. Save the tampered
      // version into quarantine first so the user can inspect it.
      const ts = nowIso().replace(/[:.]/g, '-');
      const q = path.join(this.quarantineDir, path.basename(rcPath) + '.' + ts + '.tampered');
      fs.copyFileSync(rcPath, q);
      fs.copyFileSync(baseline, rcPath);
      const result = { ok: true, quarantinedCopy: q };
      this._result(plan, result);
      return result;
    } catch (err) {
      const result = { ok: false, reason: err.message };
      this._result(plan, result);
      return result;
    }
  }

  /**
   * Seed baselines at setup time. Called from the --setup flow.
   * Captures the current state of /etc/hosts and every shell RC file
   * so the restore* functions have something to restore from.
   */
  seedBaselines() {
    // /etc/hosts
    try {
      if (fs.existsSync('/etc/hosts')) {
        fs.copyFileSync('/etc/hosts', path.join(this.baselineDir, 'etc-hosts.baseline'));
      }
    } catch {}
    // Shell RC files
    const home = os.homedir();
    const rcs = ['.zshrc', '.zprofile', '.zshenv', '.bashrc', '.bash_profile', '.profile'];
    for (const rc of rcs) {
      const full = path.join(home, rc);
      try {
        if (fs.existsSync(full)) {
          fs.copyFileSync(full, path.join(this.baselineDir, 'shellrc-' + rc));
        }
      } catch {}
    }
  }

  /**
   * Dispatch: given a classified event, decide whether to enforce.
   * Called from the runner on every analyzed event.
   */
  async handleEvent(event, snapshot) {
    try {
      switch (event.type) {
        case 'LAUNCHAGENT_NEW':
        case 'LAUNCHAGENT_MODIFIED': {
          const p = event.payload?.entry?.file;
          if (p) await this.quarantineLaunchAgent(p, event.payload?.entry?.label);
          break;
        }
        case 'PROFILE_PRESENT':
        case 'PROFILE_CHANGE': {
          // Pull identifiers from the payload if present.
          const profiles = event.payload?.profiles || event.payload?.userProfiles || [];
          for (const p of profiles) {
            const id = p.profileIdentifier || p.ProfileIdentifier || p.identifier;
            if (id) await this.removeProfile(id);
          }
          break;
        }
        case 'SHARING_ENABLED':
        case 'SHARING_ACTIVE': {
          const svc = event.payload?.underlying || event.payload?.svc;
          if (svc) await this.disableSharingService(svc);
          break;
        }
        case 'BOOT_FILE_MODIFIED':
        case 'BOOT_FILE_CREATED': {
          if (event.payload?.target === '/etc/hosts') await this.restoreHostsFile();
          break;
        }
        case 'SHELL_RC_MODIFIED': {
          if (event.payload?.path) await this.restoreShellRc(event.payload.path);
          break;
        }
        case 'EGRESS_PROCESS_NEW': {
          // Conservative auto-kill: only if the payload explicitly says
          // the process is unsigned or adhoc-signed.
          if (event.payload?.unsigned || event.payload?.adhoc) {
            // We don't have a pid directly in the payload — find it in
            // the current snapshot's egress connections.
            const proc = event.payload.process;
            const conn = (snapshot?.egress?.connections || []).find(c => c.command === proc);
            if (conn && conn.pid) {
              await this.killProcess(conn.pid, proc, 'unsigned-outbound');
            }
          }
          break;
        }
        default:
          break;
      }
    } catch (err) {
      this.append('ENFORCEMENT_ERROR', 'HIGH', { event: event.type, error: err.message });
    }
  }
}

module.exports = Enforcer;
