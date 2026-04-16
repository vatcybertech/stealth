// SHIELD Mac Sentinel — local HTTPS server.
//
// Binds to 127.0.0.1 by default (can be 0.0.0.0 if you want the iPhone PWA
// on the same Wi-Fi to reach it — see README). Self-signed cert generated
// on first run. PIN-derived bearer token for auth. No CORS wildcards.
//
// Endpoints:
//   POST /auth            { pin }         → { token, ttl }
//   GET  /status          (bearer)        → latest snapshot summary
//   GET  /alerts?since=   (bearer)        → alerts since ISO timestamp
//   GET  /ledger?since=   (bearer)        → ledger entries since ISO
//   GET  /export          (bearer)        → full signed JSON export
//   POST /whitelist       (bearer)        → modify whitelist
//   POST /journal         (bearer)        → push a PWA journal entry into the Sentinel ledger
//   POST /killswitch      (bearer)        → log a kill-switch activation
//   GET  /capabilities    (public)        → list of collectors enabled (no secrets)

'use strict';

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { constantTimeEqual, sha256, canonicalJSON, uuidv4 } = require('./crypto');

const DEFAULT_PORT = 17333;
const TOKEN_TTL_MS = 30 * 60 * 1000;
const MAX_BODY = 1 * 1024 * 1024; // 1 MB

function generateSelfSignedCert(certPath, keyPath) {
  // Use `openssl` shipped with macOS since we have no external crypto deps.
  const confPath = certPath + '.cnf';
  fs.writeFileSync(confPath, `
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = req_ext
[dn]
CN = shield-sentinel.local
O = SHIELD
[req_ext]
subjectAltName = @alt
[alt]
DNS.1 = localhost
DNS.2 = shield-sentinel.local
IP.1  = 127.0.0.1
`);
  execFileSync('/usr/bin/openssl', [
    'req', '-x509', '-nodes', '-newkey', 'rsa:2048',
    '-keyout', keyPath, '-out', certPath,
    '-days', '3650',
    '-config', confPath, '-extensions', 'req_ext',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  fs.chmodSync(keyPath, 0o600);
  fs.chmodSync(certPath, 0o644);
  fs.unlinkSync(confPath);
}

class Server {
  /**
   * @param {object} ctx
   * @param {number} ctx.port
   * @param {string} ctx.host
   * @param {string} ctx.certDir         directory for cert.pem / key.pem
   * @param {string} ctx.verifierHex     PIN verifier (hex of PBKDF2-derived bytes)
   * @param {Buffer} ctx.tokenSalt       random salt for session tokens
   * @param {function} ctx.getStatus     () → latest status object
   * @param {function} ctx.getAlerts     (sinceIso) → array
   * @param {function} ctx.getLedger     (sinceIso) → array
   * @param {function} ctx.getExport     () → export blob
   * @param {function} ctx.modifyWhitelist (change) → new whitelist
   * @param {function} ctx.recordJournal (entry) → stored entry id
   * @param {function} ctx.recordKillSwitch (context) → stored entry id
   * @param {string[]} ctx.allowedOrigins
   */
  constructor(ctx) {
    this.ctx = ctx;
    this.sessions = new Map(); // token → { expiresAt }
    this._setupCert();
    this._server = https.createServer({ key: this._key, cert: this._cert }, (req, res) => this._handle(req, res));
  }

  _setupCert() {
    const certPath = path.join(this.ctx.certDir, 'cert.pem');
    const keyPath = path.join(this.ctx.certDir, 'key.pem');
    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      fs.mkdirSync(this.ctx.certDir, { recursive: true, mode: 0o700 });
      generateSelfSignedCert(certPath, keyPath);
    }
    this._cert = fs.readFileSync(certPath);
    this._key = fs.readFileSync(keyPath);
    const fp = crypto.createHash('sha256').update(this._cert).digest('hex');
    this._certFingerprint = fp;
  }

  get certFingerprint() { return this._certFingerprint; }

  start() {
    return new Promise((resolve) => {
      this._server.listen(this.ctx.port || DEFAULT_PORT, this.ctx.host || '127.0.0.1', () => resolve());
    });
  }

  stop() {
    return new Promise((resolve) => this._server.close(() => resolve()));
  }

  _issueToken() {
    const token = crypto.randomBytes(32).toString('hex');
    this.sessions.set(token, { expiresAt: Date.now() + TOKEN_TTL_MS });
    // Garbage collect expired tokens
    const now = Date.now();
    for (const [t, s] of this.sessions.entries()) {
      if (s.expiresAt < now) this.sessions.delete(t);
    }
    return token;
  }

  _checkToken(req) {
    const auth = req.headers['authorization'] || '';
    const m = auth.match(/^Bearer\s+([0-9a-f]+)$/i);
    if (!m) return false;
    const session = this.sessions.get(m[1]);
    if (!session) return false;
    if (session.expiresAt < Date.now()) { this.sessions.delete(m[1]); return false; }
    return true;
  }

  _setCors(req, res) {
    const origin = req.headers['origin'];
    const allowed = this.ctx.allowedOrigins || [];
    if (origin && (allowed.includes(origin) || allowed.includes('*'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Max-Age', '600');
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }

  async _handle(req, res) {
    try {
      this._setCors(req, res);
      if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

      const url = new URL(req.url, `https://${req.headers.host}`);
      const route = url.pathname;

      if (route === '/capabilities' && req.method === 'GET') {
        return this._json(res, 200, {
          version: '1.0.0',
          certFingerprint: this._certFingerprint,
          collectors: ['network', 'bluetooth', 'profiles', 'launch_agents', 'login_items', 'integrity', 'processes', 'logins', 'sharing'],
        });
      }

      if (route === '/auth' && req.method === 'POST') {
        const body = await this._body(req);
        const { pin } = JSON.parse(body || '{}');
        if (typeof pin !== 'string') return this._json(res, 400, { error: 'pin required' });
        const candidate = this.ctx.verify(pin);
        if (!candidate) return this._json(res, 401, { error: 'invalid pin' });
        const token = this._issueToken();
        return this._json(res, 200, { token, ttl: TOKEN_TTL_MS, certFingerprint: this._certFingerprint });
      }

      if (!this._checkToken(req)) return this._json(res, 401, { error: 'unauthorized' });

      if (route === '/status' && req.method === 'GET') {
        const status = this.ctx.getStatus() || {};
        // Bidirectional cross-sealing: include the current Sentinel
        // ledger last-hash so the PWA can anchor it in its next journal
        // entry. Also include the auto-response state so the PWA can
        // render an acknowledge banner when needed.
        if (this.ctx.getLedgerLastHash) status.ledgerLastHash = this.ctx.getLedgerLastHash();
        if (this.ctx.getAutoResponseState) status.autoResponse = this.ctx.getAutoResponseState();
        return this._json(res, 200, status);
      }
      if (route === '/acknowledge' && req.method === 'POST') {
        if (!this.ctx.acknowledgeAutoResponse) return this._json(res, 501, { error: 'not-implemented' });
        const result = await this.ctx.acknowledgeAutoResponse();
        return this._json(res, 200, result);
      }
      if (route === '/alerts' && req.method === 'GET') {
        const since = url.searchParams.get('since') || '1970-01-01T00:00:00Z';
        return this._json(res, 200, this.ctx.getAlerts(since));
      }
      if (route === '/ledger' && req.method === 'GET') {
        const since = url.searchParams.get('since') || '1970-01-01T00:00:00Z';
        return this._json(res, 200, this.ctx.getLedger(since));
      }
      if (route === '/export' && req.method === 'GET') {
        return this._json(res, 200, this.ctx.getExport());
      }
      if (route === '/whitelist' && req.method === 'POST') {
        const body = await this._body(req);
        const change = JSON.parse(body || '{}');
        const next = this.ctx.modifyWhitelist(change);
        return this._json(res, 200, { whitelist: next });
      }
      if (route === '/journal' && req.method === 'POST') {
        const body = await this._body(req);
        const entry = JSON.parse(body || '{}');
        const id = this.ctx.recordJournal(entry);
        return this._json(res, 200, { id, ledgerLastHash: this.ctx.getLedgerLastHash ? this.ctx.getLedgerLastHash() : null });
      }
      if (route === '/killswitch' && req.method === 'POST') {
        const body = await this._body(req);
        const context = JSON.parse(body || '{}');
        const id = this.ctx.recordKillSwitch(context);
        return this._json(res, 200, { id });
      }

      return this._json(res, 404, { error: 'not found' });
    } catch (err) {
      return this._json(res, 500, { error: 'server error', message: err.message });
    }
  }

  _body(req) {
    return new Promise((resolve, reject) => {
      let len = 0;
      const chunks = [];
      req.on('data', (chunk) => {
        len += chunk.length;
        if (len > MAX_BODY) { reject(new Error('body too large')); req.destroy(); return; }
        chunks.push(chunk);
      });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
  }

  _json(res, status, obj) {
    const body = JSON.stringify(obj);
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
  }
}

module.exports = { Server, DEFAULT_PORT };
