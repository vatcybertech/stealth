// LaunchAgents / LaunchDaemons collector.
//
// macOS persistence mechanism #1 for non-root malware. Every plist in these
// directories is eligible to run on login or at system boot. We snapshot
// the full directory listing AND hash every plist's bytes so that an
// attacker modifying an existing file in place is still detected.
//
// Paths:
//   ~/Library/LaunchAgents       per-user agents
//   /Library/LaunchAgents        system-wide user agents
//   /Library/LaunchDaemons       system-wide root daemons
//   /System/Library/LaunchAgents (read-only, we only note drift)
//   /System/Library/LaunchDaemons(read-only, we only note drift)

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { sha256 } = require('../crypto');

const PATHS = [
  { path: path.join(os.homedir(), 'Library/LaunchAgents'),    type: 'user_agent',      critical: true  },
  { path: '/Library/LaunchAgents',                            type: 'system_agent',    critical: true  },
  { path: '/Library/LaunchDaemons',                           type: 'system_daemon',   critical: true  },
  { path: '/System/Library/LaunchAgents',                     type: 'apple_agent',     critical: false },
  { path: '/System/Library/LaunchDaemons',                    type: 'apple_daemon',    critical: false },
];

/**
 * Minimal plist parser for the handful of keys we care about.
 * Avoids adding a dependency for a full parser. We only extract:
 *   Label, Program, ProgramArguments, RunAtLoad, KeepAlive,
 *   StartInterval, WatchPaths
 * from simple XML plists. Binary plists are hashed but not parsed.
 */
function miniParsePlist(text) {
  const out = {};
  const want = ['Label', 'Program', 'ProgramArguments', 'RunAtLoad', 'KeepAlive', 'StartInterval', 'WatchPaths'];
  const keyRe = /<key>([^<]+)<\/key>\s*((?:<string>[^<]*<\/string>)|(?:<true\/>)|(?:<false\/>)|(?:<integer>\d+<\/integer>)|(?:<array>[\s\S]*?<\/array>))/g;
  let m;
  while ((m = keyRe.exec(text)) !== null) {
    const [, key, val] = m;
    if (!want.includes(key)) continue;
    if (/^<string>/.test(val)) out[key] = val.replace(/^<string>/, '').replace(/<\/string>$/, '');
    else if (/^<true/.test(val)) out[key] = true;
    else if (/^<false/.test(val)) out[key] = false;
    else if (/^<integer>/.test(val)) out[key] = parseInt(val.replace(/<\/?integer>/g, ''), 10);
    else if (/^<array>/.test(val)) {
      const inner = val.replace(/^<array>/, '').replace(/<\/array>$/, '');
      const items = [];
      const itemRe = /<string>([^<]*)<\/string>/g;
      let im;
      while ((im = itemRe.exec(inner)) !== null) items.push(im[1]);
      out[key] = items;
    }
  }
  return out;
}

function listDir(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return [];
    return fs.readdirSync(dirPath).filter(f => f.endsWith('.plist'));
  } catch {
    return [];
  }
}

function readPlistSafe(filePath) {
  const info = { file: filePath, hash: null, size: null, mtime: null, label: null, program: null, runAtLoad: null, keepAlive: null, error: null };
  try {
    const stat = fs.statSync(filePath);
    info.size = stat.size;
    info.mtime = stat.mtime.toISOString();
    const buf = fs.readFileSync(filePath);
    info.hash = sha256(buf);
    // Only attempt XML parse; binary plists start with "bplist00"
    if (!buf.slice(0, 8).toString('utf8').startsWith('bplist')) {
      const parsed = miniParsePlist(buf.toString('utf8'));
      info.label = parsed.Label || null;
      info.program = parsed.Program || (parsed.ProgramArguments ? parsed.ProgramArguments[0] : null);
      info.programArguments = parsed.ProgramArguments || null;
      info.runAtLoad = parsed.RunAtLoad ?? null;
      info.keepAlive = parsed.KeepAlive ?? null;
      info.startInterval = parsed.StartInterval ?? null;
      info.watchPaths = parsed.WatchPaths || null;
    } else {
      info.binary = true;
    }
  } catch (err) {
    info.error = err.message;
  }
  return info;
}

async function collect() {
  const snapshot = {};
  for (const loc of PATHS) {
    const files = listDir(loc.path);
    snapshot[loc.path] = {
      type: loc.type,
      critical: loc.critical,
      count: files.length,
      entries: files.map(f => readPlistSafe(path.join(loc.path, f))),
    };
  }

  // Aggregate totals for quick UI rendering
  let totalUserInstalled = 0;
  for (const loc of PATHS) {
    if (loc.critical) totalUserInstalled += snapshot[loc.path].count;
  }

  return {
    paths: snapshot,
    totalUserInstalled,
    collectedAt: new Date().toISOString(),
  };
}

module.exports = { collect, miniParsePlist };
