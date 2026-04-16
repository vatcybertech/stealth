// Apple Silicon SecureBoot / Secure Element collector.
//
// On Apple Silicon Macs, the operator can lower the system's Secure
// Boot posture from "Full Security" to "Reduced Security" or even
// "Permissive Security" (which allows unsigned kexts and custom
// kernel collections). This is the Mac equivalent of "jailbroken."
// An attacker who can lower secureboot policy owns the boot chain.
//
// We query:
//   bputil -d                              Boot Policy dump
//   system_profiler SPSecureElementDataType   (T2 / Secure Element state)
//
// bputil requires admin; system_profiler does not. When bputil is
// unavailable (Intel Macs, or non-admin), we log it as an INFO event
// with reason = 'bputil-unavailable' and surface only the
// system_profiler data.

'use strict';

const { run } = require('../shell');

async function collect() {
  const out = { available: false, isAppleSilicon: null };
  // Detect Apple Silicon via arch
  const arch = await run('/usr/bin/uname', ['-m'], { timeout: 2000 });
  out.isAppleSilicon = arch.stdout.trim() === 'arm64';

  if (out.isAppleSilicon) {
    // bputil will prompt for admin password interactively if run without
    // sudo -n; our run() wrapper calls execFile directly, so the process
    // will exit non-zero if auth is required. Try sudo -n first; fall
    // back to a direct call.
    const res = await run('/usr/bin/sudo', ['-n', '/usr/bin/bputil', '-d'], { timeout: 5000 });
    if (res.code === 0 && res.stdout) {
      out.available = true;
      out.raw = res.stdout.slice(0, 2000);
      // Parse a handful of key lines.
      const securityModeMatch = res.stdout.match(/Security Mode:\s*(\S+)/i);
      const kextPolicyMatch   = res.stdout.match(/3rd Party Kexts Status:\s*(\S+)/i);
      const mdmEnrollment     = res.stdout.match(/User\-Approved MDM:\s*(\S+)/i);
      const bootPolicy        = res.stdout.match(/Policy:\s*(.+)/);
      out.securityMode  = securityModeMatch ? securityModeMatch[1] : null;
      out.kextPolicy    = kextPolicyMatch   ? kextPolicyMatch[1]   : null;
      out.mdmEnrollment = mdmEnrollment     ? mdmEnrollment[1]     : null;
      out.bootPolicy    = bootPolicy        ? bootPolicy[1].trim() : null;
      out.fullSecurity  = /full/i.test(out.securityMode || '');
    } else {
      out.available = false;
      out.error = res.stderr?.slice(0, 200) || 'bputil requires sudo';
    }
  }

  // T2 / Secure Element information
  const se = await run('/usr/sbin/system_profiler', ['SPSecureElementDataType', '-json'], { timeout: 8000 });
  if (se.code === 0 && se.stdout) {
    try {
      const parsed = JSON.parse(se.stdout);
      out.secureElement = parsed.SPSecureElementDataType || null;
    } catch {}
  }

  out.collectedAt = new Date().toISOString();
  return out;
}

module.exports = { collect };
