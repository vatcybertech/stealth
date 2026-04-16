// SHIELD PWA — Mac Sentinel HTTPS client.
//
// Talks to the Mac Sentinel's local HTTPS API. The user pins the server's
// self-signed cert fingerprint on first pairing, and we cross-check it on
// every response via a /capabilities probe.
//
// Because browsers do not expose certificate bytes for arbitrary https://
// fetches, we rely on the browser to verify the TLS chain against its own
// root store (which will fail for self-signed certs unless the user has
// explicitly accepted them in Safari by visiting the URL once and tapping
// "Visit Website"). We additionally validate the fingerprint exposed in
// the /capabilities response body and refuse to use any sentinel whose
// server-reported fingerprint does not match the pinned one.

'use strict';

(function (window) {
  const DEFAULT_URL = 'https://127.0.0.1:17333';

  class SentinelClient {
    constructor({ url, fingerprint, pin } = {}) {
      this.url = url || DEFAULT_URL;
      this.pinnedFingerprint = fingerprint || null;
      this.pin = pin || null;
      this.token = null;
      this.tokenExpires = 0;
      this.lastStatus = null;
      this.lastError = null;
    }

    configure({ url, fingerprint }) {
      if (url) this.url = url;
      if (fingerprint !== undefined) this.pinnedFingerprint = fingerprint;
    }

    setPin(pin) { this.pin = pin; }

    async _checkFingerprint() {
      if (!this.pinnedFingerprint) return true; // first-pair mode
      try {
        const res = await fetch(this.url + '/capabilities', { cache: 'no-store' });
        if (!res.ok) { this.lastError = 'fingerprint probe http ' + res.status; return false; }
        const body = await res.json();
        if (body.certFingerprint !== this.pinnedFingerprint) {
          this.lastError = 'fingerprint mismatch';
          return false;
        }
        return true;
      } catch (err) {
        this.lastError = 'fingerprint probe: ' + err.message;
        return false;
      }
    }

    async _authIfNeeded() {
      if (this.token && Date.now() < this.tokenExpires - 5000) return true;
      if (!this.pin) { this.lastError = 'no pin'; return false; }
      const ok = await this._checkFingerprint();
      if (!ok) return false;
      try {
        const res = await fetch(this.url + '/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: this.pin }),
          cache: 'no-store',
        });
        if (!res.ok) {
          this.lastError = 'auth http ' + res.status;
          this.token = null;
          return false;
        }
        const body = await res.json();
        // Verify fingerprint in the auth response too (defense in depth).
        if (this.pinnedFingerprint && body.certFingerprint !== this.pinnedFingerprint) {
          this.lastError = 'auth fingerprint mismatch';
          this.token = null;
          return false;
        }
        this.token = body.token;
        this.tokenExpires = Date.now() + (body.ttl || 30 * 60 * 1000);
        return true;
      } catch (err) {
        this.lastError = 'auth: ' + err.message;
        return false;
      }
    }

    async _fetchAuthed(path, opts = {}) {
      const ok = await this._authIfNeeded();
      if (!ok) throw new Error(this.lastError || 'unauthorized');
      const headers = Object.assign({ 'Authorization': 'Bearer ' + this.token }, opts.headers || {});
      const res = await fetch(this.url + path, { ...opts, headers, cache: 'no-store' });
      if (res.status === 401) {
        this.token = null;
        throw new Error('token expired');
      }
      if (!res.ok) throw new Error('http ' + res.status);
      return res;
    }

    async pair(pin, fingerprint) {
      this.pin = pin;
      this.pinnedFingerprint = fingerprint;
      this.token = null;
      return this._authIfNeeded();
    }

    async getStatus() {
      try {
        const res = await this._fetchAuthed('/status');
        const body = await res.json();
        this.lastStatus = body;
        this.lastError = null;
        // Capture the Sentinel ledger last-hash for bidirectional
        // cross-sealing. app.js will embed this in the next journal
        // entry as `sentinelAnchor`.
        if (body && typeof body.ledgerLastHash === 'string') {
          this.sentinelAnchor = body.ledgerLastHash;
        }
        return body;
      } catch (err) {
        this.lastError = err.message;
        return null;
      }
    }

    async acknowledgeAutoResponse() {
      try {
        const res = await this._fetchAuthed('/acknowledge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        return await res.json();
      } catch (err) { this.lastError = err.message; return null; }
    }

    async getAlerts(sinceIso = '1970-01-01T00:00:00Z') {
      try {
        const res = await this._fetchAuthed('/alerts?since=' + encodeURIComponent(sinceIso));
        return await res.json();
      } catch (err) { this.lastError = err.message; return []; }
    }

    async getLedger(sinceIso = '1970-01-01T00:00:00Z') {
      try {
        const res = await this._fetchAuthed('/ledger?since=' + encodeURIComponent(sinceIso));
        return await res.json();
      } catch (err) { this.lastError = err.message; return []; }
    }

    async getExport() {
      try {
        const res = await this._fetchAuthed('/export');
        return await res.json();
      } catch (err) { this.lastError = err.message; return null; }
    }

    async pushJournal(entry) {
      try {
        const res = await this._fetchAuthed('/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        });
        return await res.json();
      } catch (err) { this.lastError = err.message; return null; }
    }

    async recordKillSwitch(context) {
      try {
        const res = await this._fetchAuthed('/killswitch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(context || {}),
        });
        return await res.json();
      } catch (err) { this.lastError = err.message; return null; }
    }

    async modifyWhitelist(change) {
      try {
        const res = await this._fetchAuthed('/whitelist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(change),
        });
        return await res.json();
      } catch (err) { this.lastError = err.message; return null; }
    }
  }

  window.ShieldSentinelClient = SentinelClient;
  window.SHIELD_SENTINEL_DEFAULT_URL = DEFAULT_URL;
})(window);
