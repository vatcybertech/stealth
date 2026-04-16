// Boot persistence collector.
//
// Inventory the classic boot-time persistence locations that sit
// outside the LaunchAgents/LaunchDaemons paths our other collector
// watches. Any change here is a high-signal attacker foothold.
//
// Targets:
//   /etc/rc.common          legacy rc script included by /etc/rc.*
//   /etc/synthetic.conf     synthetic root-level symlinks (readonly FS)
//   /etc/hosts              DNS override (commonly used to pin evil CDNs)
//   /etc/pam.d/             PAM stack — can install auth backdoors
//   /etc/sudoers            sudo rules (NOPASSWD additions)
//   /etc/kcpassword         auto-login stored password (should not exist)
//   /etc/pf.conf            pf firewall rules
//   /etc/newsyslog.conf     log rotation — can be used for destructive cleanup
//   /Library/StartupItems/  legacy startup scripts dir (mostly empty now)
//
// Each target is either a file we hash or a directory we enumerate-
// and-hash. On every scan we diff against previous state. Any change
// fires an event — mostly HIGH, CRITICAL for /etc/hosts changes
// (DNS poisoning) and for sudoers.

'use strict';

const fs = require('fs');
const path = require('path');
const { sha256 } = require('../crypto');

const TARGETS = [
  { path: '/etc/rc.common',        kind: 'file', severity: 'HIGH'     },
  { path: '/etc/synthetic.conf',   kind: 'file', severity: 'HIGH'     },
  { path: '/etc/hosts',            kind: 'file', severity: 'CRITICAL' },
  { path: '/etc/sudoers',          kind: 'file', severity: 'CRITICAL' },
  { path: '/etc/kcpassword',       kind: 'file', severity: 'CRITICAL' },
  { path: '/etc/pf.conf',          kind: 'file', severity: 'HIGH'     },
  { path: '/etc/newsyslog.conf',   kind: 'file', severity: 'MEDIUM'   },
  { path: '/etc/pam.d',            kind: 'dir',  severity: 'HIGH'     },
  { path: '/etc/sudoers.d',        kind: 'dir',  severity: 'CRITICAL' },
  { path: '/Library/StartupItems', kind: 'dir',  severity: 'HIGH'     },
  { path: '/etc/periodic/daily',   kind: 'dir',  severity: 'MEDIUM'   },
  { path: '/etc/periodic/weekly',  kind: 'dir',  severity: 'MEDIUM'   },
  { path: '/etc/periodic/monthly', kind: 'dir',  severity: 'MEDIUM'   },
];

function hashFile(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    return { exists: true, size: buf.length, hash: sha256(buf), mtime: fs.statSync(filePath).mtime.toISOString() };
  } catch (err) {
    return { exists: false, error: err.code || err.message };
  }
}

function hashDir(dirPath) {
  const out = { exists: false, entries: [] };
  try {
    if (!fs.existsSync(dirPath)) return out;
    out.exists = true;
    const names = fs.readdirSync(dirPath).sort();
    for (const name of names) {
      const full = path.join(dirPath, name);
      try {
        const stat = fs.statSync(full);
        if (stat.isFile()) {
          const buf = fs.readFileSync(full);
          out.entries.push({ name, kind: 'file', size: buf.length, hash: sha256(buf), mtime: stat.mtime.toISOString() });
        } else if (stat.isDirectory()) {
          out.entries.push({ name, kind: 'dir' });
        }
      } catch {}
    }
  } catch (err) {
    out.error = err.message;
  }
  return out;
}

async function collect() {
  const targets = {};
  for (const t of TARGETS) {
    if (t.kind === 'file') targets[t.path] = { kind: 'file', severity: t.severity, ...hashFile(t.path) };
    else targets[t.path] = { kind: 'dir', severity: t.severity, ...hashDir(t.path) };
  }
  return { targets, collectedAt: new Date().toISOString() };
}

module.exports = { collect, TARGETS };
