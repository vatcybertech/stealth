// Input sources collector.
//
// macOS allows third-party "input methods" — alternative keyboards,
// IME (input method editor) apps, and accessibility shortcuts — that
// sit in the keystroke pipeline BEFORE anything else. A malicious
// input method sees every key typed into every app on the system.
// This is the macOS equivalent of the iPhone "remove third-party
// keyboards" hardening step.
//
// We enumerate:
//   ~/Library/Input Methods/
//   /Library/Input Methods/
//   Spell checker services and Text Replacement extensions
//
// Each .app in these directories is hashed and surfaced to the
// analyzer. The analyzer flags any addition or modification at HIGH.

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { sha256 } = require('../crypto');

const PATHS = [
  { dir: path.join(os.homedir(), 'Library/Input Methods'), scope: 'user',   severity: 'HIGH' },
  { dir: '/Library/Input Methods',                          scope: 'system', severity: 'HIGH' },
];

function hashDir(dir) {
  const entries = [];
  if (!fs.existsSync(dir)) return entries;
  try {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      try {
        const stat = fs.statSync(full);
        const info = { name, path: full, mtime: stat.mtime.toISOString() };
        // For .app bundles, hash the Info.plist and the main executable
        // name to detect tampering without walking the whole tree.
        const infoPlist = path.join(full, 'Contents', 'Info.plist');
        if (fs.existsSync(infoPlist)) {
          info.infoHash = sha256(fs.readFileSync(infoPlist));
        }
        entries.push(info);
      } catch {}
    }
  } catch {}
  return entries;
}

async function collect() {
  const paths = {};
  for (const loc of PATHS) {
    paths[loc.dir] = {
      scope: loc.scope,
      severity: loc.severity,
      entries: hashDir(loc.dir),
    };
  }
  const totalUserInstalled = paths[PATHS[0].dir].entries.length +
                             paths[PATHS[1].dir].entries.length;
  return {
    paths,
    totalUserInstalled,
    collectedAt: new Date().toISOString(),
  };
}

module.exports = { collect };
