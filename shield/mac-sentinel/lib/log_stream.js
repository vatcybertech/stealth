// SHIELD Mac Sentinel — real-time log stream subscriber.
//
// Spawns a single persistent `log stream --predicate` subprocess on
// startup and fans parsed events to the analyzer/ledger as they
// arrive. This replaces polling-based detection in the wifi_deauth,
// av_devices, and logins collectors with sub-second real-time.
//
// Predicate targets (single OR-joined expression):
//   - wifid                       (deauth / disassoc)
//   - appleh13camerad + coreaudiod + com.apple.cmio (camera / mic)
//   - sudo / su / authorizationdb (privilege escalation)
//   - loginwindow / screensharingd / ARDAgent (auth + remote access)
//
// Each stdout line is parsed and classified into an event object
// forwarded to the ledger.append function. The subprocess is
// restarted on crash with exponential backoff.

'use strict';

const { spawn } = require('child_process');

const PREDICATE = [
  'process == "wifid"',
  'process == "appleh13camerad"',
  'process == "coreaudiod"',
  'subsystem == "com.apple.cmio"',
  'process == "sudo"',
  'process == "su"',
  'process == "authorizationdb"',
  'process == "loginwindow"',
  'process == "screensharingd"',
  'process == "ARDAgent"',
].join(' OR ');

/**
 * Classify a raw `log stream` compact-format line into an event.
 * Returns null if the line does not match any pattern.
 */
function classify(line) {
  const lower = line.toLowerCase();

  // Wi-Fi deauth/disassoc
  if (/wifid\b/.test(line) && /(disassoc|disassociat|deauth|deauthent)/i.test(line)) {
    return { type: 'WIFI_DEAUTH_REALTIME', severity: 'HIGH', payload: { raw: line } };
  }
  // Camera activation
  if (/(appleh13camerad|com\.apple\.cmio)/i.test(line) && /(start|open|activ|acquir|begin)/i.test(line)) {
    return { type: 'CAMERA_ACTIVE_REALTIME', severity: 'HIGH', payload: { raw: line } };
  }
  // Mic activation
  if (/coreaudiod/i.test(line) && /(start|open|activ|acquir|begin|input)/i.test(line) && /(mic|input)/i.test(line)) {
    return { type: 'MIC_ACTIVE_REALTIME', severity: 'HIGH', payload: { raw: line } };
  }
  // Sudo failed
  if (/sudo/i.test(line) && /(incorrect password|authentication failure|not in the sudoers|command not allowed|not allowed to run sudo)/i.test(line)) {
    return { type: 'SUDO_FAIL_REALTIME', severity: 'CRITICAL', payload: { raw: line } };
  }
  // Sudo success
  if (/sudo\b/.test(line) && /COMMAND=/i.test(line)) {
    return { type: 'SUDO_RUN_REALTIME', severity: 'HIGH', payload: { raw: line } };
  }
  // Authorizationdb change
  if (/authorizationdb/i.test(line) && /(write|modify|set)/i.test(line)) {
    return { type: 'AUTHDB_MODIFIED', severity: 'HIGH', payload: { raw: line } };
  }
  // Screen sharing / ARD session begin
  if (/(screensharingd|ARDAgent)/i.test(line) && /(connected|session|started|open)/i.test(line)) {
    return { type: 'REMOTE_SESSION_OPEN', severity: 'CRITICAL', payload: { raw: line } };
  }
  // Loginwindow auth events
  if (/loginwindow/i.test(line) && /(auth|unlock|login|fail)/i.test(line)) {
    return { type: 'LOGIN_EVENT', severity: 'MEDIUM', payload: { raw: line } };
  }
  return null;
}

class LogStream {
  /**
   * @param {object} ctx
   * @param {object} ctx.config      logStream block from config
   * @param {function} ctx.onEvent   (event) => void — where to send classified events
   * @param {function} ctx.onError   (err) => void   — optional error reporter
   */
  constructor(ctx) {
    this.config = ctx.config || {};
    this.onEvent = ctx.onEvent;
    this.onError = ctx.onError || (() => {});
    this.proc = null;
    this.buffer = '';
    this.backoffMs = this.config.restartBackoffMs || 5000;
    this.stopped = false;
  }

  start() {
    if (!this.config.enabled) return { started: false, reason: 'disabled-in-config' };
    this._spawn();
    return { started: true };
  }

  stop() {
    this.stopped = true;
    if (this.proc) {
      try { this.proc.kill('SIGTERM'); } catch {}
      this.proc = null;
    }
  }

  _spawn() {
    if (this.stopped) return;
    try {
      this.proc = spawn('/usr/bin/log', [
        'stream',
        '--style', 'compact',
        '--predicate', PREDICATE,
      ], { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
      this.onError(err);
      this._scheduleRestart();
      return;
    }

    this.proc.stdout.on('data', (chunk) => {
      this.buffer += chunk.toString('utf8');
      const parts = this.buffer.split('\n');
      this.buffer = parts.pop() || '';
      for (const line of parts) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        // Header lines from `log stream` look like:
        //   "Timestamp                       (process)[PID]"
        // which we filter out.
        if (/^Timestamp\s/.test(trimmed)) continue;
        if (/^Filtering the log data using/i.test(trimmed)) continue;
        const event = classify(trimmed);
        if (event && this.onEvent) {
          try { this.onEvent(event); } catch (err) { this.onError(err); }
        }
      }
    });

    this.proc.stderr.on('data', (chunk) => {
      this.onError(new Error('log stream stderr: ' + chunk.toString('utf8').slice(0, 200)));
    });

    this.proc.on('exit', (code, signal) => {
      this.proc = null;
      this.buffer = '';
      if (!this.stopped) {
        this.onError(new Error(`log stream exited code=${code} signal=${signal}`));
        this._scheduleRestart();
      }
    });

    this.proc.on('error', (err) => {
      this.onError(err);
      this._scheduleRestart();
    });
  }

  _scheduleRestart() {
    if (this.stopped) return;
    setTimeout(() => this._spawn(), this.backoffMs);
    // Modest exponential backoff capped at 60s.
    this.backoffMs = Math.min(this.backoffMs * 2, 60_000);
    setTimeout(() => { this.backoffMs = this.config.restartBackoffMs || 5000; }, 300_000);
  }
}

module.exports = { LogStream, classify, PREDICATE };
