// SHIELD Mac Sentinel — self-integrity check.
//
// On every start, the Sentinel re-hashes its own source files (sentinel.js,
// lib/*.js, lib/collectors/*.js) and compares them against an HMAC-signed
// manifest written at install time. If the hashes have drifted, we log a
// CRITICAL SELF_INTEGRITY_FAIL event and refuse to start the scan loop.
//
// The HMAC key is derived from the user's PIN via PBKDF2 with a dedicated
// salt, so an attacker who modifies the source files cannot produce a
// matching signature without the PIN.
//
// This is the first thing an attacker targets: disable the watcher, then
// do whatever. The self-integrity check is what makes that attack visible.

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { canonicalJSON } = require('./crypto');

const MANIFEST_VERSION = 1;

/**
 * Walk a directory and return all .js files (recursively).
 */
function listJsFiles(rootDir) {
  const out = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
    }
  }
  walk(rootDir);
  return out.sort();
}

/**
 * Compute SHA-256 hex of a file's bytes.
 */
function hashFile(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Produce the manifest object (before signing).
 */
function buildManifest(sentinelRoot) {
  const files = listJsFiles(sentinelRoot);
  const entries = {};
  for (const f of files) {
    const rel = path.relative(sentinelRoot, f);
    entries[rel] = hashFile(f);
  }
  return {
    version: MANIFEST_VERSION,
    createdAt: new Date().toISOString(),
    sentinelRoot,
    entries,
  };
}

/**
 * Derive a dedicated HMAC key for the manifest. A separate salt purpose
 * means leak of the manifest does not leak the ledger key or verifier.
 */
function deriveManifestKey(pin, salt) {
  return crypto.pbkdf2Sync(
    pin,
    Buffer.concat([salt, Buffer.from('shield:manifest:v1', 'utf8')]),
    600_000,
    32,
    'sha256',
  );
}

/**
 * Sign a manifest object with HMAC-SHA256. Returns { manifest, hmac }.
 */
function signManifest(manifest, hmacKey) {
  const hmac = crypto.createHmac('sha256', hmacKey);
  hmac.update(canonicalJSON(manifest));
  return { manifest, hmac: hmac.digest('hex') };
}

/**
 * Write a signed manifest to disk.
 */
function writeManifest(filePath, signed) {
  fs.writeFileSync(filePath, JSON.stringify(signed, null, 2), { mode: 0o600 });
}

/**
 * Load a signed manifest and verify both the HMAC and the per-file hashes.
 * Returns { ok: bool, reason?: string, drifted?: string[] }.
 */
function verifyManifest(filePath, sentinelRoot, hmacKey) {
  if (!fs.existsSync(filePath)) return { ok: false, reason: 'missing' };
  let signed;
  try {
    signed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return { ok: false, reason: 'parse_failed' };
  }
  // Verify HMAC
  const hmac = crypto.createHmac('sha256', hmacKey);
  hmac.update(canonicalJSON(signed.manifest));
  const expected = hmac.digest('hex');
  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signed.hmac || '', 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { ok: false, reason: 'hmac_mismatch' };
    }
  } catch {
    return { ok: false, reason: 'hmac_mismatch' };
  }
  // Verify per-file hashes — detect any post-install modification.
  const drifted = [];
  const missing = [];
  const added = [];
  const manifestFiles = Object.keys(signed.manifest.entries || {});
  const currentFiles = listJsFiles(sentinelRoot).map(f => path.relative(sentinelRoot, f));
  const currentSet = new Set(currentFiles);
  const manifestSet = new Set(manifestFiles);
  for (const rel of manifestFiles) {
    if (!currentSet.has(rel)) { missing.push(rel); continue; }
    const actualHash = hashFile(path.join(sentinelRoot, rel));
    if (actualHash !== signed.manifest.entries[rel]) drifted.push(rel);
  }
  for (const rel of currentFiles) {
    if (!manifestSet.has(rel)) added.push(rel);
  }
  if (drifted.length || missing.length || added.length) {
    return { ok: false, reason: 'file_drift', drifted, missing, added };
  }
  return { ok: true };
}

module.exports = {
  MANIFEST_VERSION,
  listJsFiles,
  hashFile,
  buildManifest,
  deriveManifestKey,
  signManifest,
  writeManifest,
  verifyManifest,
};
