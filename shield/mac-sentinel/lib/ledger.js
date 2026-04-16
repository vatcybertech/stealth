// SHIELD Mac Sentinel — hash-chained, encrypted ledger
//
// Append-only JSONL file. Each line is a base64 AES-256-GCM blob whose
// plaintext is a canonical-JSON entry of the form:
//
//   {
//     id:       UUIDv4
//     ts:       ISO 8601 UTC timestamp
//     tz:       local timezone offset in minutes
//     type:     event type (SCAN, PROFILE_CHANGE, ...)
//     severity: INFO | LOW | MEDIUM | HIGH | CRITICAL
//     payload:  arbitrary event data
//     prevHash: sha256 of the previous entry's canonical form, or GENESIS
//     hash:     sha256(prevHash || canonicalJSON(entry-without-hash))
//   }
//
// Tamper detection: on load, we walk the chain and re-verify every hash.
// Any mismatch raises a LEDGER_TAMPER event and surfaces to the PWA.
//
// Append semantics: writes are O_APPEND so two concurrent appends won't
// interleave within a single line boundary.

'use strict';

const fs = require('fs');
const path = require('path');
const {
  encrypt, decrypt, sha256, canonicalJSON, uuidv4, nowIso, nowTzOffset,
} = require('./crypto');

const GENESIS_HASH = '0'.repeat(64);
const SEVERITIES = Object.freeze(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

class Ledger {
  /**
   * @param {string} filePath  absolute path to the encrypted JSONL file
   * @param {Buffer} key       32-byte AES key derived from PIN
   */
  constructor(filePath, key) {
    this.filePath = filePath;
    this.key = key;
    this._lastHash = GENESIS_HASH;
    this._count = 0;
    this._tamperDetected = false;
    this._ensureDir();
  }

  _ensureDir() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, '', { mode: 0o600 });
    }
  }

  /**
   * Walk and verify the existing ledger. Sets _lastHash and _count.
   * If tamper is detected, sets _tamperDetected and returns the index
   * of the first broken entry.
   * @returns {{ok: boolean, brokenAt: number|null, count: number}}
   */
  verify() {
    const raw = fs.readFileSync(this.filePath, 'utf8');
    const lines = raw.split('\n').filter(Boolean);
    let prevHash = GENESIS_HASH;
    for (let i = 0; i < lines.length; i++) {
      let plaintext;
      try {
        const blob = Buffer.from(lines[i], 'base64');
        plaintext = decrypt(this.key, blob);
      } catch (err) {
        this._tamperDetected = true;
        this._lastHash = prevHash;
        this._count = i;
        return { ok: false, brokenAt: i, count: i, reason: 'decrypt_failed' };
      }
      let entry;
      try {
        entry = JSON.parse(plaintext);
      } catch (err) {
        this._tamperDetected = true;
        this._lastHash = prevHash;
        this._count = i;
        return { ok: false, brokenAt: i, count: i, reason: 'parse_failed' };
      }
      if (entry.prevHash !== prevHash) {
        this._tamperDetected = true;
        this._lastHash = prevHash;
        this._count = i;
        return { ok: false, brokenAt: i, count: i, reason: 'prev_hash_mismatch' };
      }
      const { hash, ...unhashed } = entry;
      const expected = sha256(prevHash + canonicalJSON(unhashed));
      if (expected !== hash) {
        this._tamperDetected = true;
        this._lastHash = prevHash;
        this._count = i;
        return { ok: false, brokenAt: i, count: i, reason: 'hash_mismatch' };
      }
      prevHash = hash;
    }
    this._lastHash = prevHash;
    this._count = lines.length;
    this._tamperDetected = false;
    return { ok: true, brokenAt: null, count: lines.length };
  }

  /**
   * Append a new entry to the ledger.
   * @param {string} type
   * @param {string} severity
   * @param {object} payload
   * @param {object} [extra]  optional top-level fields such as pwaAnchor
   *                           (bidirectional ledger cross-sealing)
   * @returns {object} the written entry
   */
  append(type, severity, payload = {}, extra = {}) {
    if (!SEVERITIES.includes(severity)) {
      throw new Error(`invalid severity: ${severity}`);
    }
    const unhashed = {
      id: uuidv4(),
      ts: nowIso(),
      tz: nowTzOffset(),
      type,
      severity,
      payload,
      prevHash: this._lastHash,
      ...(extra && extra.pwaAnchor ? { pwaAnchor: extra.pwaAnchor } : {}),
    };
    const hash = sha256(this._lastHash + canonicalJSON(unhashed));
    const entry = { ...unhashed, hash };
    const plaintext = JSON.stringify(entry);
    const blob = encrypt(this.key, plaintext);
    fs.appendFileSync(this.filePath, blob.toString('base64') + '\n', { mode: 0o600 });
    this._lastHash = hash;
    this._count += 1;
    return entry;
  }

  /**
   * Read all entries. This decrypts the entire ledger — use sparingly
   * and only after verify() has succeeded or you have accepted tamper.
   * @returns {Array<object>}
   */
  readAll() {
    const raw = fs.readFileSync(this.filePath, 'utf8');
    const lines = raw.split('\n').filter(Boolean);
    const out = [];
    for (const line of lines) {
      try {
        const blob = Buffer.from(line, 'base64');
        const plaintext = decrypt(this.key, blob);
        out.push(JSON.parse(plaintext));
      } catch (err) {
        // Skip broken lines — verify() will have already flagged them.
      }
    }
    return out;
  }

  /**
   * Read entries since a given ISO timestamp (exclusive).
   * @param {string} sinceIso
   * @returns {Array<object>}
   */
  readSince(sinceIso) {
    return this.readAll().filter(e => e.ts > sinceIso);
  }

  get lastHash() { return this._lastHash; }
  get count()    { return this._count; }
  get tampered() { return this._tamperDetected; }
}

Ledger.GENESIS_HASH = GENESIS_HASH;
Ledger.SEVERITIES = SEVERITIES;

module.exports = Ledger;
