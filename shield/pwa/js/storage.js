// SHIELD PWA — encrypted IndexedDB storage.
//
// Stores:
//   settings       key → value pairs (PIN salt, verifier, sentinel pairing, autolock, etc.)
//   journal        hash-chained journal entries (encrypted blobs)
//   alerts         encrypted alert cache (mirrored from sentinel)
//   checklist      hardening checklist progress (encrypted)
//   photos         journal photo attachments (encrypted Uint8Array blobs)
//
// Every value stored except the settings-level PIN verifier is an
// AES-256-GCM blob. The key is held in memory only.
//
// settings entries are stored as plain JSON so we can load the salt +
// verifier before the user enters a PIN. NO sensitive data goes in
// settings — only public cryptographic parameters.

'use strict';

(function (window) {
  const DB_NAME = 'shield';
  const DB_VERSION = 2;
  const STORES = {
    settings: { keyPath: 'key' },
    journal:  { keyPath: 'id' },
    alerts:   { keyPath: 'id' },
    checklist:{ keyPath: 'id' },
    photos:   { keyPath: 'id' },
    // settings_cache holds encrypted cached Sentinel state so the
    // dashboard shows a last-known posture when the phone is off the
    // local network. Added in v1.3.
    settings_cache: { keyPath: 'id' },
  };

  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror   = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        for (const [name, opts] of Object.entries(STORES)) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, opts);
        }
      };
    });
    return dbPromise;
  }

  function tx(storeName, mode = 'readonly') {
    return openDb().then(db => {
      const t = db.transaction(storeName, mode);
      return t.objectStore(storeName);
    });
  }

  function req(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror   = () => reject(request.error);
    });
  }

  // ─── Settings (plaintext — public params only) ──────────────────────
  async function getSetting(key) {
    const store = await tx('settings', 'readonly');
    const row = await req(store.get(key));
    return row ? row.value : undefined;
  }
  async function setSetting(key, value) {
    const store = await tx('settings', 'readwrite');
    await req(store.put({ key, value }));
  }
  async function getAllSettings() {
    const store = await tx('settings', 'readonly');
    const rows = await req(store.getAll());
    const out = {};
    for (const r of rows) out[r.key] = r.value;
    return out;
  }

  // ─── Encrypted CRUD ─────────────────────────────────────────────────
  async function putEncrypted(storeName, key, id, obj) {
    const plaintext = JSON.stringify(obj);
    const blob = await window.ShieldCrypto.encrypt(key, plaintext);
    const store = await tx(storeName, 'readwrite');
    await req(store.put({ id, blob: blob.buffer }));
    return id;
  }
  async function getEncrypted(storeName, key, id) {
    const store = await tx(storeName, 'readonly');
    const row = await req(store.get(id));
    if (!row) return null;
    const blob = new Uint8Array(row.blob);
    const plaintext = await window.ShieldCrypto.decrypt(key, blob);
    return JSON.parse(plaintext);
  }
  async function getAllEncrypted(storeName, key) {
    const store = await tx(storeName, 'readonly');
    const rows = await req(store.getAll());
    const out = [];
    for (const row of rows) {
      try {
        const blob = new Uint8Array(row.blob);
        const plaintext = await window.ShieldCrypto.decrypt(key, blob);
        out.push(JSON.parse(plaintext));
      } catch (err) {
        out.push({ _decryptError: true, id: row.id });
      }
    }
    return out;
  }
  async function deleteById(storeName, id) {
    const store = await tx(storeName, 'readwrite');
    await req(store.delete(id));
  }
  async function clearStore(storeName) {
    const store = await tx(storeName, 'readwrite');
    await req(store.clear());
  }

  // ─── Full wipe ──────────────────────────────────────────────────────
  async function wipeAll() {
    for (const name of Object.keys(STORES)) {
      await clearStore(name);
    }
    // Also delete the database entirely.
    dbPromise = null;
    await new Promise((resolve, reject) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
      req.onblocked = () => resolve();
    });
  }

  window.ShieldStorage = {
    openDb,
    getSetting, setSetting, getAllSettings,
    putEncrypted, getEncrypted, getAllEncrypted, deleteById, clearStore,
    wipeAll,
  };
})(window);
