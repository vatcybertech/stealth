// Canary files collector.
//
// We plant inert honeypot files in two attacker-magnet locations:
//
//   1) ~/Library/LaunchAgents/.shield-canary.plist
//      This looks like a launchd plist but has an intentionally invalid
//      Label so launchd will refuse to load it. Its only purpose is to
//      be deleted or modified by an attacker reviewing the directory.
//
//   2) ~/Library/Application Support/SHIELD/canary.json
//      A second canary inside the SHIELD state dir. Any attacker who
//      finds the SHIELD directory will probably touch this.
//
// On first run we create the canaries (if absent) and record their
// hash, size, and mtime. On every scan we re-read them and flag any of:
//
//   - canary removed    → CANARY_REMOVED    CRITICAL
//   - canary modified   → CANARY_MODIFIED   CRITICAL
//   - canary read-access (mtime unchanged but atime advanced — on
//     filesystems that track atime, which APFS does if relatime is
//     enabled)   → CANARY_ACCESSED MEDIUM
//
// False-positive rate is essentially zero because nothing legitimate
// touches these files.

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { sha256 } = require('../crypto');

const CANARY_PLIST_CONTENT = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>__SHIELD_CANARY_DO_NOT_LOAD__</string>
  <key>Disabled</key>
  <true/>
</dict>
</plist>
`;

const CANARIES = [
  {
    id: 'la-canary',
    path: path.join(os.homedir(), 'Library/LaunchAgents/.shield-canary.plist'),
    content: CANARY_PLIST_CONTENT,
    critical: true,
    label: 'LaunchAgents canary',
  },
  {
    id: 'as-canary',
    path: path.join(os.homedir(), 'Library/Application Support/SHIELD/canary.json'),
    content: '{"do_not_touch":true,"purpose":"shield canary","created":"' + new Date().toISOString() + '"}\n',
    critical: true,
    label: 'Application Support canary',
  },
];

function ensureCanariesExist() {
  for (const c of CANARIES) {
    try {
      const dir = path.dirname(c.path);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      if (!fs.existsSync(c.path)) {
        fs.writeFileSync(c.path, c.content, { mode: 0o600 });
      }
    } catch {}
  }
}

function readCanaryState() {
  const states = [];
  for (const c of CANARIES) {
    const state = { id: c.id, label: c.label, path: c.path, critical: c.critical };
    try {
      if (!fs.existsSync(c.path)) { state.exists = false; states.push(state); continue; }
      state.exists = true;
      const stat = fs.statSync(c.path);
      state.size = stat.size;
      state.mtime = stat.mtime.toISOString();
      state.atime = stat.atime.toISOString();
      const buf = fs.readFileSync(c.path);
      state.hash = sha256(buf);
    } catch (err) {
      state.error = err.message;
    }
    states.push(state);
  }
  return states;
}

async function collect() {
  ensureCanariesExist();
  const canaries = readCanaryState();
  return { canaries, count: canaries.length, collectedAt: new Date().toISOString() };
}

module.exports = { collect, ensureCanariesExist, CANARIES };
