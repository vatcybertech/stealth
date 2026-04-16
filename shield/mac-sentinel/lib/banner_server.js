// SHIELD Mac Sentinel — network deterrent banner server.
//
// Serves a short HTML notice on port 80 of the local interface (disabled
// by default). Any device on the LAN that browses to this Mac's IP will
// see the notice. This is pure deterrence — it does not block, filter,
// or redirect traffic. It exists to make it clear to anyone probing the
// network that it is actively monitored and that unauthorized access is
// a federal and state crime.
//
// Port 80 requires root on macOS (privileged port). The sentinel runs
// as the user under LaunchAgent, so by default this server is DISABLED
// in config/defaults.json. To enable it, an operator must either:
//   a) run the sentinel as a LaunchDaemon (system scope) — documented
//      in docs/DEPLOY.md under "Advanced: deterrent banner"
//   b) bind to an unprivileged port (8080) and set up pf redirection
//      from 80 → 8080
//
// When bind fails, we log and return a disabled handle so the rest of
// the sentinel continues unaffected.
//
// Legal note: publishing this notice on your own network is legitimate
// and well-tested. See docs/LEGAL.md.

'use strict';

const http = require('http');
const { nowIso } = require('./crypto');

// Deterrent banner — defense-contractor-facility-alarm feel. Precise,
// legal, minimal, intimidating through specificity instead of volume.
// Black background, vermillion accent band, monospace timestamps,
// statute citations, and a visible serial/session identifier that
// implies (correctly) that this request was logged and indexed.
const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>AUTHORIZED PERSONNEL ONLY</title>
<style>
:root { color-scheme: dark; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: #07070A;
  color: #F0ECE6;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif;
  min-height: 100vh;
  padding: 48px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.frame {
  max-width: 780px;
  width: 100%;
  background: #0D0D12;
  border: 1px solid #1E1E26;
  border-top: 4px solid #C23B22;
  border-radius: 2px;
  padding: 0;
  box-shadow: 0 40px 120px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(194, 59, 34, 0.12);
  overflow: hidden;
}
.strip {
  background: repeating-linear-gradient(90deg, rgba(194,59,34,0.14) 0 14px, transparent 14px 28px);
  padding: 10px 28px;
  font-family: "SF Mono", Menlo, Monaco, monospace;
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #E25438;
  font-weight: 700;
  border-bottom: 1px solid #1E1E26;
}
.body { padding: 40px 44px 32px; }
.class-line {
  font-family: "SF Mono", Menlo, monospace;
  font-size: 10px;
  color: #C23B22;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  font-weight: 700;
  border-left: 2px solid #C23B22;
  padding-left: 12px;
  margin-bottom: 18px;
}
h1 {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif;
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 0 0 6px;
  color: #F7F4EE;
  line-height: 1.12;
}
.sub {
  font-size: 13px;
  color: #908A84;
  margin: 0 0 28px;
  letter-spacing: 0.01em;
}
.stmt {
  font-size: 13.5px;
  line-height: 1.75;
  color: #D4CFC8;
  margin: 0 0 16px;
}
.stmt strong { color: #F0ECE6; font-weight: 600; }
.rule {
  border: none;
  border-top: 1px solid #1E1E26;
  margin: 24px 0;
}
.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: #1E1E26;
  border: 1px solid #1E1E26;
  margin: 18px 0 22px;
}
.stat {
  background: #0D0D12;
  padding: 14px 18px;
}
.stat .k {
  font-family: "SF Mono", Menlo, monospace;
  font-size: 9.5px;
  color: #605A54;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  margin-bottom: 6px;
}
.stat .v {
  font-family: "SF Mono", Menlo, monospace;
  font-size: 13px;
  color: #F0ECE6;
  font-weight: 500;
  word-break: break-all;
}
.stat.red .v { color: #E25438; }
ul.statutes {
  list-style: none;
  margin: 0;
  padding: 0;
}
ul.statutes li {
  font-size: 12.5px;
  color: #908A84;
  padding: 6px 0 6px 16px;
  border-left: 2px solid #C23B22;
  margin-bottom: 6px;
}
ul.statutes li strong { color: #F0ECE6; font-weight: 600; display: block; }
.footer {
  background: #050507;
  padding: 16px 28px;
  border-top: 1px solid #1E1E26;
  font-family: "SF Mono", Menlo, monospace;
  font-size: 10px;
  color: #605A54;
  letter-spacing: 0.04em;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
@media (max-width: 560px) {
  .body { padding: 28px 24px 20px; }
  h1 { font-size: 22px; }
  .stats { grid-template-columns: 1fr; }
}
</style>
</head>
<body>
<div class="frame">
  <div class="strip">◼ Restricted network — monitored system ◼</div>
  <div class="body">
    <div class="class-line">Authorized use only · access is logged</div>
    <h1>You have reached a monitored endpoint.</h1>
    <p class="sub">This device and its local network are under continuous host-based intrusion detection. Your request has been recorded.</p>

    <hr class="rule">

    <p class="stmt">Every connection to this host is captured with source address, device fingerprint, timestamp, and process-level attribution, and written to a cryptographically <strong>hash-chained, tamper-evident ledger</strong> preserved for law-enforcement review. Evidence exports are generated on demand in a format suitable for submission to federal and state investigators.</p>

    <p class="stmt">If you are not an authorized user of this system, you have already produced a legally sufficient record of unauthorized access as of the timestamp below. Continued interaction compounds the record.</p>

    <div class="stats">
      <div class="stat"><div class="k">Observation active since</div><div class="v">__OBSERVED_SINCE__</div></div>
      <div class="stat"><div class="k">Request logged at</div><div class="v">__NOW__</div></div>
      <div class="stat red"><div class="k">Source address</div><div class="v">__SOURCE_IP__</div></div>
      <div class="stat"><div class="k">Record identifier</div><div class="v">__RECORD_ID__</div></div>
    </div>

    <p class="stmt" style="margin-top:24px">Applicable law in this jurisdiction:</p>
    <ul class="statutes">
      <li><strong>18 U.S.C. § 1030 — Computer Fraud and Abuse Act</strong>Unauthorized access to a protected computer is a federal offense punishable by fine and imprisonment.</li>
      <li><strong>18 U.S.C. § 2511 — Wiretap Act</strong>Unauthorized interception of wire or electronic communications is a federal offense.</li>
      <li><strong>Ohio Revised Code § 2913.04 — Unauthorized Use of Computer, Cable, or Telecommunication Property</strong>A felony under Ohio state law.</li>
      <li><strong>Ohio Revised Code § 2913.42 — Tampering with Records</strong>Modification or destruction of records stored on this system constitutes an additional offense.</li>
    </ul>

    <hr class="rule">

    <p class="stmt" style="font-size:12px;color:#605A54;margin:0">
      If you believe you have reached this notice in error: disconnect now. Further action will extend the evidence record. Any subsequent communication with the owner of this system must go through counsel or law enforcement, not through this endpoint.
    </p>
  </div>
  <div class="footer">
    <span>SHIELD · host-based IDS · hash-chained ledger</span>
    <span>__RECORD_ID__</span>
  </div>
</div>
</body>
</html>
`;

class BannerServer {
  /**
   * @param {object} ctx
   * @param {object} ctx.config      bannerServer block from config
   * @param {function} ctx.append    ledger.append
   * @param {string} ctx.observedSince  ISO timestamp when SHIELD was installed
   */
  constructor(ctx) {
    this.config = ctx.config || {};
    this.append = ctx.append;
    this.observedSince = ctx.observedSince;
    this.server = null;
    this.recentIps = new Map(); // ip -> lastServedAt (for dedup in log)
    this.running = false;
  }

  /**
   * Attempt to start. On failure (almost always: EACCES on port 80),
   * we log once and return quietly. Other parts of the sentinel are
   * unaffected.
   */
  async start() {
    if (!this.config.enabled) return { started: false, reason: 'disabled-in-config' };
    const port = this.config.port || 80;
    const host = this.config.bindAddress || '0.0.0.0';
    return new Promise((resolve) => {
      try {
        this.server = http.createServer((req, res) => this._handle(req, res));
        this.server.on('error', (err) => {
          this.append('BANNER_SERVER_ERROR', 'LOW', {
            error: err.code || err.message,
            port, host,
            message: err.code === 'EACCES'
              ? 'Banner server requires root to bind port 80. Install as LaunchDaemon to enable.'
              : 'Banner server bind failed.',
          });
          this.server = null;
          this.running = false;
          resolve({ started: false, reason: err.code || 'error' });
        });
        this.server.listen(port, host, () => {
          this.running = true;
          this.append('BANNER_SERVER_STARTED', 'INFO', { port, host });
          resolve({ started: true, port, host });
        });
      } catch (err) {
        this.append('BANNER_SERVER_ERROR', 'LOW', { error: err.message });
        resolve({ started: false, reason: err.message });
      }
    });
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => this.server.close(() => { this.running = false; resolve(); }));
    }
  }

  _handle(req, res) {
    const ip = (req.socket && req.socket.remoteAddress) || 'unknown';
    const now = Date.now();
    const last = this.recentIps.get(ip) || 0;
    // Dedup per IP to 15 minutes — avoid filling the ledger from a
    // single curious client hitting refresh.
    if (now - last > 15 * 60 * 1000) {
      this.recentIps.set(ip, now);
      this.append('BANNER_SERVED', 'INFO', { ip, method: req.method, url: req.url });
    }
    // Per-request record identifier, logged alongside the source IP.
    // Format intentionally matches the case number format used in the
    // evidence report so an investigator can cross-reference.
    const nowDate = new Date();
    const pad = n => String(n).padStart(2, '0');
    const recordId = `SHIELD-${nowDate.getUTCFullYear()}-${pad(nowDate.getUTCMonth()+1)}-${pad(nowDate.getUTCDate())}-${pad(nowDate.getUTCHours())}${pad(nowDate.getUTCMinutes())}${pad(nowDate.getUTCSeconds())}-${Math.random().toString(16).slice(2,8).toUpperCase()}`;
    const body = HTML_TEMPLATE
      .replace(/__OBSERVED_SINCE__/g, this.observedSince || 'unknown')
      .replace(/__NOW__/g, nowIso())
      .replace(/__SOURCE_IP__/g, ip.replace(/[^0-9a-fA-F:.]/g, ''))
      .replace(/__RECORD_ID__/g, recordId);
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    });
    res.end(body);
  }
}

module.exports = BannerServer;
