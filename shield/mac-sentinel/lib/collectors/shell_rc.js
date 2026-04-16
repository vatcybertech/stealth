// Shell RC file hash collector.
//
// Attacker backdoors in shell startup files are the most common non-
// root persistence on Unix-like systems: one line added to ~/.zshrc
// can re-establish a reverse shell every time the user opens a
// terminal. We hash every shell-startup file the user is likely to
// source and surface any change.
//
// Targets:
//   Per-user:  ~/.zshrc .zprofile .zshenv .zlogin .zlogout
//              ~/.bash_profile .bashrc .bash_login .profile
//   System:    /etc/zshrc /etc/zshenv /etc/zprofile /etc/zlogin
//              /etc/bashrc /etc/profile
//
// These files SHOULD be stable on a personal device. Any drift is
// surfaced by the analyzer as SHELL_RC_MODIFIED HIGH.

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { sha256 } = require('../crypto');

const USER_FILES = [
  '.zshrc', '.zprofile', '.zshenv', '.zlogin', '.zlogout',
  '.bash_profile', '.bashrc', '.bash_login', '.profile',
  '.inputrc',
];
const SYSTEM_FILES = [
  '/etc/zshrc', '/etc/zshenv', '/etc/zprofile', '/etc/zlogin',
  '/etc/bashrc', '/etc/profile',
];

function hashFile(p) {
  try {
    const stat = fs.statSync(p);
    if (!stat.isFile()) return null;
    const buf = fs.readFileSync(p);
    return {
      path: p,
      size: stat.size,
      mtime: stat.mtime.toISOString(),
      hash: sha256(buf),
      // Also capture the first/last few lines for quick triage in the
      // ledger without the full file content.
      firstLines: buf.toString('utf8').split('\n').slice(0, 3).join(' | ').slice(0, 200),
      lastLines: buf.toString('utf8').split('\n').slice(-3).join(' | ').slice(0, 200),
    };
  } catch {
    return null;
  }
}

async function collect() {
  const home = os.homedir();
  const out = { files: [] };
  for (const f of USER_FILES) {
    const info = hashFile(path.join(home, f));
    if (info) { info.scope = 'user'; out.files.push(info); }
  }
  for (const f of SYSTEM_FILES) {
    const info = hashFile(f);
    if (info) { info.scope = 'system'; out.files.push(info); }
  }
  return { ...out, count: out.files.length, collectedAt: new Date().toISOString() };
}

module.exports = { collect };
