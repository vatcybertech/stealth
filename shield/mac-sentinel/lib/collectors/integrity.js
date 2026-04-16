// System integrity collector — Lockdown Mode, FileVault, SIP, Gatekeeper,
// Firewall, XProtect version, macOS version.
//
// All of these are boolean / simple-string checks, but collectively they
// are the highest-signal posture readout on the Mac. If any of them is
// off when you remember turning it on, that is CRITICAL.

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { run } = require('../shell');

async function readLockdownMode() {
  // Lockdown Mode user pref — the plist key is LDMGlobalEnabled (int).
  // We read via `defaults` to handle both XML and binary plists safely.
  const res = await run('/usr/bin/defaults', ['read', 'com.apple.security.Lockdown', 'LDMGlobalEnabled'], { timeout: 4000 });
  if (res.code === 0) return res.stdout.trim() === '1';
  return false;
}

async function readFileVault() {
  const res = await run('/usr/bin/fdesetup', ['status'], { timeout: 4000 });
  if (res.code !== 0) return { enabled: null, raw: res.stderr || res.error };
  return { enabled: /FileVault is On/i.test(res.stdout), raw: res.stdout.trim() };
}

async function readSip() {
  const res = await run('/usr/bin/csrutil', ['status'], { timeout: 4000 });
  if (res.code !== 0) return { enabled: null, raw: res.stderr || res.error };
  return { enabled: /enabled/i.test(res.stdout) && !/disabled/i.test(res.stdout), raw: res.stdout.trim() };
}

async function readGatekeeper() {
  const res = await run('/usr/sbin/spctl', ['--status'], { timeout: 4000 });
  if (res.code !== 0) return { enabled: null, raw: res.stderr || res.error };
  return { enabled: /assessments enabled/i.test(res.stdout), raw: res.stdout.trim() };
}

async function readFirewall() {
  const res = await run('/usr/libexec/ApplicationFirewall/socketfilterfw', ['--getglobalstate'], { timeout: 4000 });
  if (res.code !== 0) return { enabled: null, raw: res.stderr || res.error };
  return { enabled: /Firewall is enabled/i.test(res.stdout), raw: res.stdout.trim() };
}

async function readFirewallStealth() {
  const res = await run('/usr/libexec/ApplicationFirewall/socketfilterfw', ['--getstealthmode'], { timeout: 4000 });
  if (res.code !== 0) return null;
  return /Stealth mode enabled/i.test(res.stdout);
}

async function readMacOsVersion() {
  const res = await run('/usr/bin/sw_vers', [], { timeout: 4000 });
  const out = {};
  for (const line of res.stdout.split('\n')) {
    const m = line.match(/^(ProductName|ProductVersion|BuildVersion):\s*(.+)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

async function readXprotectVersion() {
  // XProtect meta plist is under /Library/Apple/System/Library/CoreServices/XProtect.bundle/Contents
  const candidates = [
    '/Library/Apple/System/Library/CoreServices/XProtect.bundle/Contents/Resources/XProtect.meta.plist',
    '/System/Library/CoreServices/XProtect.bundle/Contents/Resources/XProtect.meta.plist',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const res = await run('/usr/bin/defaults', ['read', p, 'Version'], { timeout: 4000 });
      if (res.code === 0) return res.stdout.trim();
    }
  }
  return null;
}

async function readTccHash() {
  // We can't read the contents without Full Disk Access, but we CAN stat
  // and hash the file from the user's own TCC.db to detect tampering.
  const userTcc = path.join(os.homedir(), 'Library/Application Support/com.apple.TCC/TCC.db');
  const out = { userExists: false, userHash: null, userMtime: null };
  try {
    if (fs.existsSync(userTcc)) {
      out.userExists = true;
      const stat = fs.statSync(userTcc);
      out.userMtime = stat.mtime.toISOString();
      out.userSize = stat.size;
      // Hash only if small-ish — avoid 500MB edge cases
      if (stat.size < 50 * 1024 * 1024) {
        const crypto = require('crypto');
        const buf = fs.readFileSync(userTcc);
        out.userHash = crypto.createHash('sha256').update(buf).digest('hex');
      }
    }
  } catch (err) {
    out.error = err.message;
  }
  return out;
}

async function collect() {
  const [lockdown, fv, sip, gk, fw, fwStealth, ver, xprotect, tcc] = await Promise.all([
    readLockdownMode(),
    readFileVault(),
    readSip(),
    readGatekeeper(),
    readFirewall(),
    readFirewallStealth(),
    readMacOsVersion(),
    readXprotectVersion(),
    readTccHash(),
  ]);

  return {
    lockdownMode: { enabled: !!lockdown },
    fileVault: fv,
    sip,
    gatekeeper: gk,
    firewall: { ...fw, stealth: fwStealth },
    macOs: ver,
    xprotectVersion: xprotect,
    tcc,
    collectedAt: new Date().toISOString(),
  };
}

module.exports = { collect };
