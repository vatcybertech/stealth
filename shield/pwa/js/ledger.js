// SHIELD PWA — hash-chained journal ledger.
//
// Same schema as the Mac Sentinel ledger:
//   { id, ts, tz, type, severity, payload, prevHash, hash }
//
// Storage lives in the IndexedDB `journal` store, one AES-GCM blob per
// entry. Each blob contains the full entry including hashes. On load we
// decrypt all entries, sort by ts, and re-verify the chain.

'use strict';

(function (window) {
  const GENESIS_HASH = '0'.repeat(64);
  const SEVERITIES = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  class Ledger {
    constructor(key) {
      this.key = key;
      this.entries = [];
      this.lastHash = GENESIS_HASH;
      this.tamperInfo = null;
    }

    async load() {
      const rows = await window.ShieldStorage.getAllEncrypted('journal', this.key);
      const valid = rows.filter(e => !e._decryptError);
      valid.sort((a, b) => a.ts.localeCompare(b.ts));
      let prev = GENESIS_HASH;
      let brokenAt = null;
      let brokenReason = null;
      for (let i = 0; i < valid.length; i++) {
        const e = valid[i];
        if (e.prevHash !== prev) { brokenAt = i; brokenReason = 'prev_hash_mismatch'; break; }
        const { hash, ...unhashed } = e;
        const expected = await window.ShieldCrypto.sha256Hex(prev + window.ShieldCrypto.canonicalJSON(unhashed));
        if (expected !== hash) { brokenAt = i; brokenReason = 'hash_mismatch'; break; }
        prev = hash;
      }
      this.entries = valid;
      this.lastHash = prev;
      if (brokenAt !== null) {
        this.tamperInfo = { brokenAt, reason: brokenReason };
      } else if (rows.length !== valid.length) {
        this.tamperInfo = { brokenAt: 0, reason: 'decrypt_failed' };
      } else {
        this.tamperInfo = null;
      }
      return this.tamperInfo === null;
    }

    async append(type, severity, payload = {}, extra = {}) {
      if (!SEVERITIES.includes(severity)) throw new Error('invalid severity: ' + severity);
      const unhashed = {
        id: window.ShieldCrypto.uuidv4(),
        ts: new Date().toISOString(),
        tz: -new Date().getTimezoneOffset(),
        type,
        severity,
        payload,
        prevHash: this.lastHash,
        // Bidirectional cross-sealing: every journal entry embeds the
        // most recent Sentinel ledger last-hash we have seen, so
        // tampering with the Sentinel ledger is detectable from the
        // PWA journal alone.
        ...(extra && extra.sentinelAnchor ? { sentinelAnchor: extra.sentinelAnchor } : {}),
      };
      const hash = await window.ShieldCrypto.sha256Hex(this.lastHash + window.ShieldCrypto.canonicalJSON(unhashed));
      const entry = { ...unhashed, hash };
      await window.ShieldStorage.putEncrypted('journal', this.key, entry.id, entry);
      this.entries.push(entry);
      this.lastHash = hash;
      return entry;
    }

    async remove(id) {
      // Deletion is itself logged — we append a tombstone event BEFORE removing.
      const target = this.entries.find(e => e.id === id);
      if (!target) return false;
      await this.append('JOURNAL_DELETE', 'MEDIUM', { deletedId: id, deletedTs: target.ts, deletedType: target.type });
      await window.ShieldStorage.deleteById('journal', id);
      this.entries = this.entries.filter(e => e.id !== id);
      return true;
    }

    getAll() { return [...this.entries]; }
    getSeverityCounts() {
      const out = { INFO: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
      for (const e of this.entries) out[e.severity] = (out[e.severity] || 0) + 1;
      return out;
    }
  }

  Ledger.GENESIS_HASH = GENESIS_HASH;
  Ledger.SEVERITIES = SEVERITIES;

  window.ShieldLedger = Ledger;
})(window);
