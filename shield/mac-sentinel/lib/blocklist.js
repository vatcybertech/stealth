// SHIELD Mac Sentinel — pf firewall blocklist manager.
//
// When counter-reconnaissance detects an unknown device with remote-
// access ports open (5900 VNC, 3283 ARD, 3389 RDP), we add the IP to
// a dedicated pf table named `shield_block`. The pf config anchor
// that references this table is installed once via:
//
//   sudo pfctl -a com.shield.block -f /etc/pf.anchors/com.shield.block
//
// where /etc/pf.anchors/com.shield.block contains a single line:
//
//   block quick from <shield_block> to any
//   block quick from any to <shield_block>
//
// Full setup procedure is documented in docs/ENFORCEMENT.md.
//
// The blocklist is persisted in the SHIELD state dir (encrypted) so
// that after reboots we re-populate the pf table from our own
// authoritative copy, not from pf's volatile state.

'use strict';

const fs = require('fs');
const path = require('path');
const { run } = require('./shell');
const { nowIso } = require('./crypto');

class Blocklist {
  /**
   * @param {object} ctx
   * @param {function} ctx.append    ledger.append
   * @param {string}   ctx.stateFile path to persisted blocklist json (plaintext)
   * @param {object}   ctx.config    blocklist block from config/defaults.json
   */
  constructor(ctx) {
    this.append = ctx.append;
    this.stateFile = ctx.stateFile;
    this.config = ctx.config || {};
    this.table = this.config.tableName || 'shield_block';
    this.entries = new Map(); // ip -> { addedAt, reason, metadata }
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const raw = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
        for (const e of raw.entries || []) this.entries.set(e.ip, e);
      }
    } catch {}
  }

  _save() {
    try {
      fs.writeFileSync(this.stateFile, JSON.stringify({ entries: Array.from(this.entries.values()), savedAt: nowIso() }, null, 2), { mode: 0o600 });
    } catch (err) {
      this.append('BLOCKLIST_PERSIST_ERROR', 'LOW', { error: err.message });
    }
  }

  get count() { return this.entries.size; }
  get ips() { return Array.from(this.entries.keys()); }

  /**
   * Refresh the pf table from our in-memory authoritative copy.
   * Called at startup and whenever the set changes.
   */
  async syncToKernel() {
    if (!this.config.enabled) return { ok: false, reason: 'disabled' };
    if (this.entries.size === 0) {
      const r = await run('/usr/bin/sudo', ['-n', '/sbin/pfctl', '-t', this.table, '-T', 'flush'], { timeout: 5000 });
      return { ok: r.code === 0, flushed: true };
    }
    // Replace the table contents wholesale: flush then bulk-add.
    const ips = Array.from(this.entries.keys());
    const flush = await run('/usr/bin/sudo', ['-n', '/sbin/pfctl', '-t', this.table, '-T', 'flush'], { timeout: 5000 });
    const add = await run('/usr/bin/sudo', ['-n', '/sbin/pfctl', '-t', this.table, '-T', 'add', ...ips], { timeout: 8000 });
    return {
      ok: flush.code === 0 && add.code === 0,
      count: ips.length,
      flushOk: flush.code === 0,
      addOk: add.code === 0,
      stderr: (flush.stderr || '') + (add.stderr || ''),
    };
  }

  /**
   * Add an IP to the blocklist and sync to kernel.
   */
  async add(ip, reason, metadata = {}) {
    if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
      this.append('BLOCKLIST_ADD_REJECTED', 'LOW', { ip, reason: 'not-ipv4' });
      return { ok: false, reason: 'not-ipv4' };
    }
    if (this.entries.has(ip)) return { ok: true, duplicate: true };
    this.entries.set(ip, { ip, reason, metadata, addedAt: nowIso() });
    this._save();
    this.append('BLOCKLIST_ADDED', 'HIGH', { ip, reason, metadata, total: this.entries.size });
    const sync = await this.syncToKernel();
    if (!sync.ok) this.append('BLOCKLIST_SYNC_ERROR', 'HIGH', sync);
    return { ok: true, sync };
  }

  async remove(ip) {
    if (!this.entries.has(ip)) return { ok: true, notPresent: true };
    this.entries.delete(ip);
    this._save();
    this.append('BLOCKLIST_REMOVED', 'INFO', { ip, total: this.entries.size });
    return await this.syncToKernel();
  }

  async start() {
    if (!this.config.enabled) return;
    // On startup, push our in-memory state to the kernel so that pf
    // re-populates to our authoritative copy after reboots.
    const r = await this.syncToKernel();
    this.append('BLOCKLIST_STARTED', r.ok ? 'INFO' : 'LOW', { count: this.entries.size, sync: r });
  }
}

module.exports = Blocklist;
