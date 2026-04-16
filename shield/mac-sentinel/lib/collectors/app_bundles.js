// Application bundle integrity collector.
//
// "He could customize every app." That is exactly the kind of
// attacker who replaces a legitimate .app bundle's executable (or
// its Info.plist, or its helper tools) with a modified version that
// looks identical but phones home. Code signing catches this ONLY
// if Gatekeeper is enforcing, SIP is on, and the attacker hasn't
// also registered their own signing identity. We cannot rely on the
// platform alone.
//
// This collector walks /Applications and ~/Applications and records:
//
//   - bundle name + path
//   - SHA-256 of the main executable (from Contents/MacOS/<exec>)
//   - SHA-256 of Info.plist
//   - codesign -dv identity + TeamIdentifier
//   - mtime of the .app directory
//
// The analyzer compares this against the previous snapshot and
// fires APP_BUNDLE_MODIFIED HIGH on any change in executable hash
// or signing identity. Info.plist changes fire at MEDIUM since
// legitimate app updates touch it regularly.
//
// To keep the scan fast, we cache hashes per app path across runs:
// if the mtime of the .app has not changed, we reuse the previous
// hash without recomputing. Fresh scan on first run takes a few
// seconds; subsequent scans are nearly free.

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { sha256 } = require('../crypto');
const { run } = require('../shell');

const SCAN_ROOTS = [
  '/Applications',
  path.join(os.homedir(), 'Applications'),
];

// In-memory cache: appPath -> { mtimeMs, result }
const CACHE = new Map();

async function inspectBundle(appPath) {
  try {
    const stat = fs.statSync(appPath);
    const mtimeMs = stat.mtimeMs;
    const cached = CACHE.get(appPath);
    if (cached && cached.mtimeMs === mtimeMs) return cached.result;

    const contents = path.join(appPath, 'Contents');
    const infoPlist = path.join(contents, 'Info.plist');
    const macOSDir = path.join(contents, 'MacOS');
    const result = {
      path: appPath,
      name: path.basename(appPath),
      mtime: stat.mtime.toISOString(),
      mtimeMs,
      infoPlistHash: null,
      execHash: null,
      execPath: null,
      teamId: null,
      identity: null,
      signed: null,
    };
    if (fs.existsSync(infoPlist)) {
      try {
        const buf = fs.readFileSync(infoPlist);
        result.infoPlistHash = sha256(buf);
      } catch {}
    }
    if (fs.existsSync(macOSDir)) {
      try {
        // The main executable's name is usually in Info.plist under
        // CFBundleExecutable, but parsing binary plists is annoying.
        // Heuristic: pick the first (and usually only) file in MacOS/.
        const entries = fs.readdirSync(macOSDir);
        if (entries.length > 0) {
          const execName = entries[0];
          const execFull = path.join(macOSDir, execName);
          const execStat = fs.statSync(execFull);
          // Skip giant executables (>200MB — e.g., Xcode, Final Cut) to
          // keep the hashing budget bounded.
          if (execStat.size <= 200 * 1024 * 1024) {
            const buf = fs.readFileSync(execFull);
            result.execHash = sha256(buf);
            result.execPath = execFull;
            result.execSize = execStat.size;
          } else {
            result.execPath = execFull;
            result.execSize = execStat.size;
            result.execHash = 'SKIPPED_TOO_LARGE';
          }
        }
      } catch {}
    }
    // Code-signing identity
    const cs = await run('/usr/bin/codesign', ['-dv', '--verbose=2', appPath], { timeout: 4000 });
    const out = (cs.stderr || '') + (cs.stdout || '');
    const teamMatch = out.match(/TeamIdentifier=(\S+)/);
    const authMatch = out.match(/Authority=([^\n]+)/);
    if (teamMatch) result.teamId = teamMatch[1];
    if (authMatch) result.identity = authMatch[1].trim();
    result.signed = !/not signed at all/i.test(out) && !!authMatch;

    CACHE.set(appPath, { mtimeMs, result });
    return result;
  } catch (err) {
    return { path: appPath, error: err.message };
  }
}

async function collect() {
  const bundles = [];
  for (const root of SCAN_ROOTS) {
    try {
      if (!fs.existsSync(root)) continue;
      const entries = fs.readdirSync(root);
      for (const entry of entries) {
        if (!entry.endsWith('.app')) continue;
        const full = path.join(root, entry);
        const info = await inspectBundle(full);
        if (info) bundles.push(info);
      }
    } catch {}
  }
  return {
    bundles,
    count: bundles.length,
    collectedAt: new Date().toISOString(),
  };
}

module.exports = { collect };
