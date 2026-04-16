// SHIELD Mac Sentinel — crypto primitives
// Node built-in crypto only. Zero external deps.
//
// All persistent state is encrypted with AES-256-GCM using a key derived
// from the user's PIN via PBKDF2(100k, SHA-256). The key only exists in
// memory while the daemon is unlocked.

'use strict';

const crypto = require('crypto');

// OWASP 2023 minimum for PBKDF2-HMAC-SHA256 is 600,000 iterations.
// Apple (1Password) uses 650,000. Bitwarden defaults to 600,000.
// Bumped from the 2018-era 100,000 after security review.
const PBKDF2_ITERATIONS = 600_000;
const PBKDF2_DIGEST = 'sha256';
const KEY_LENGTH = 32; // 256-bit AES key
const SALT_LENGTH = 32;
const IV_LENGTH = 12;  // 96-bit nonce for GCM
const TAG_LENGTH = 16; // 128-bit GCM tag

/**
 * Derive an AES-256 key from a PIN and salt using PBKDF2-HMAC-SHA256.
 * @param {string} pin
 * @param {Buffer} salt
 * @returns {Buffer} 32-byte key
 */
function deriveKey(pin, salt) {
  if (typeof pin !== 'string' || pin.length < 6) {
    throw new Error('PIN must be a string of at least 6 characters');
  }
  if (!Buffer.isBuffer(salt) || salt.length !== SALT_LENGTH) {
    throw new Error(`salt must be a ${SALT_LENGTH}-byte Buffer`);
  }
  return crypto.pbkdf2Sync(pin, salt, PBKDF2_ITERATIONS, KEY_LENGTH, PBKDF2_DIGEST);
}

/**
 * Generate a cryptographically secure random salt.
 * @param {number} length
 * @returns {Buffer}
 */
function randomSalt(length = SALT_LENGTH) {
  return crypto.randomBytes(length);
}

/**
 * Encrypt a UTF-8 string with AES-256-GCM.
 * Output format: [salt-independent, includes only iv || ciphertext || tag]
 * The salt is stored separately in the file header so many entries share it.
 * @param {Buffer} key
 * @param {string} plaintext
 * @returns {Buffer}
 */
function encrypt(key, plaintext) {
  if (!Buffer.isBuffer(key) || key.length !== KEY_LENGTH) {
    throw new Error('key must be a 32-byte Buffer');
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ciphertext, tag]);
}

/**
 * Decrypt a blob produced by encrypt().
 * @param {Buffer} key
 * @param {Buffer} blob
 * @returns {string}
 */
function decrypt(key, blob) {
  if (!Buffer.isBuffer(key) || key.length !== KEY_LENGTH) {
    throw new Error('key must be a 32-byte Buffer');
  }
  if (!Buffer.isBuffer(blob) || blob.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('ciphertext blob is too short');
  }
  const iv = blob.subarray(0, IV_LENGTH);
  const tag = blob.subarray(blob.length - TAG_LENGTH);
  const ciphertext = blob.subarray(IV_LENGTH, blob.length - TAG_LENGTH);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
}

/**
 * SHA-256 of a Buffer or string. Returns lowercase hex.
 */
function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Canonical, deterministic JSON serialization.
 * Sorts object keys recursively so that hashing is stable.
 * @param {any} value
 * @returns {string}
 */
function canonicalJSON(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJSON).join(',') + ']';
  }
  const keys = Object.keys(value).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalJSON(value[k])).join(',') + '}';
}

/**
 * Constant-time comparison. Returns true if equal.
 * Safe against timing attacks.
 */
function constantTimeEqual(a, b) {
  const ba = Buffer.isBuffer(a) ? a : Buffer.from(String(a), 'utf8');
  const bb = Buffer.isBuffer(b) ? b : Buffer.from(String(b), 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * Produce a verifier hash for PIN verification (separate from ledger key).
 * Uses a DIFFERENT salt than the ledger key so that even if the ledger
 * file is leaked, it cannot be cross-referenced against the verifier file.
 */
function makeVerifier(pin, verifierSalt) {
  const key = crypto.pbkdf2Sync(
    pin,
    Buffer.concat([verifierSalt, Buffer.from('shield:verifier:v1', 'utf8')]),
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    PBKDF2_DIGEST,
  );
  return key.toString('hex');
}

/**
 * UUID v4 without any dependency.
 */
function uuidv4() {
  const b = crypto.randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

/**
 * ISO 8601 UTC timestamp.
 */
function nowIso() {
  return new Date().toISOString();
}

/**
 * Local timezone offset in minutes from UTC.
 */
function nowTzOffset() {
  return -new Date().getTimezoneOffset();
}

module.exports = {
  PBKDF2_ITERATIONS,
  KEY_LENGTH,
  SALT_LENGTH,
  deriveKey,
  randomSalt,
  encrypt,
  decrypt,
  sha256,
  canonicalJSON,
  constantTimeEqual,
  makeVerifier,
  uuidv4,
  nowIso,
  nowTzOffset,
};
