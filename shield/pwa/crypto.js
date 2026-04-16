// SHIELD PWA — Web Crypto helpers.
//
// Same primitives as the Mac Sentinel: PBKDF2(100k, SHA-256) → AES-256-GCM,
// a canonical-JSON serializer for stable hashing, a SHA-256 hex helper,
// and a constant-time string compare.
//
// The derived AES key lives only in memory while the app is unlocked. On
// lock, we zero the key reference and call gc() hints (structuredClone
// + reassign). Data on disk is never readable without the PIN.

'use strict';

(function (window) {
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  // OWASP 2023 minimum for PBKDF2-HMAC-SHA256 is 600,000 iterations.
  // Apple (1Password) uses 650,000. Bitwarden defaults to 600,000.
  // Bumped from the 2018-era 100,000 after security review.
  const PBKDF2_ITERATIONS = 600_000;
  const KEY_LENGTH_BITS = 256;
  const SALT_BYTES = 32;
  const IV_BYTES = 12;

  /**
   * Derive an AES-GCM key from a PIN and salt using PBKDF2-HMAC-SHA256.
   * Returns a non-extractable CryptoKey usable for encrypt/decrypt.
   */
  async function deriveKey(pin, salt) {
    if (typeof pin !== 'string' || pin.length < 6) throw new Error('PIN must be ≥6 chars');
    if (!(salt instanceof Uint8Array) || salt.length !== SALT_BYTES) throw new Error('salt must be a 32-byte Uint8Array');
    const baseKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(pin),
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: KEY_LENGTH_BITS },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  /**
   * Derive a separate verifier hash from PIN — different salt usage so
   * compromise of the verifier file does not reveal the ledger key.
   */
  async function makeVerifier(pin, verifierSalt) {
    const baseKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(pin),
      { name: 'PBKDF2' },
      false,
      ['deriveBits'],
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: concat(verifierSalt, enc.encode('shield:verifier:v1')),
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      baseKey,
      256,
    );
    return bufToHex(new Uint8Array(bits));
  }

  function randomBytes(n) {
    const b = new Uint8Array(n);
    crypto.getRandomValues(b);
    return b;
  }

  /**
   * Encrypt a UTF-8 string. Returns Uint8Array: [iv(12) || ciphertext || tag(16)].
   */
  async function encrypt(key, plaintext) {
    const iv = randomBytes(IV_BYTES);
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plaintext),
    );
    return concat(iv, new Uint8Array(ct));
  }

  /**
   * Decrypt a blob produced by encrypt(). Returns the UTF-8 string.
   */
  async function decrypt(key, blob) {
    if (!(blob instanceof Uint8Array) || blob.length < IV_BYTES + 16) throw new Error('ciphertext too short');
    const iv = blob.subarray(0, IV_BYTES);
    const ct = blob.subarray(IV_BYTES);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return dec.decode(pt);
  }

  async function sha256Hex(input) {
    const buf = typeof input === 'string' ? enc.encode(input) : input;
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return bufToHex(new Uint8Array(hash));
  }

  /**
   * Canonical, deterministic JSON serialization.
   * Sorts object keys recursively so that hashing is stable.
   */
  function canonicalJSON(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(canonicalJSON).join(',') + ']';
    const keys = Object.keys(value).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalJSON(value[k])).join(',') + '}';
  }

  function constantTimeEqual(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  function bufToHex(buf) {
    return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  function hexToBuf(hex) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
    return out;
  }
  function concat(a, b) {
    const out = new Uint8Array(a.length + b.length);
    out.set(a, 0);
    out.set(b, a.length);
    return out;
  }
  function uuidv4() {
    // Use crypto.randomUUID if available, fallback otherwise.
    if (crypto.randomUUID) return crypto.randomUUID();
    const b = randomBytes(16);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = bufToHex(b);
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
  }

  window.ShieldCrypto = {
    PBKDF2_ITERATIONS, SALT_BYTES, IV_BYTES,
    deriveKey, makeVerifier, randomBytes,
    encrypt, decrypt, sha256Hex, canonicalJSON,
    constantTimeEqual, bufToHex, hexToBuf, uuidv4,
  };
})(window);
