// Process / code-signature collector.
//
// Enumerates running processes and verifies the code signature of each
// unique executable path. Unsigned or ad-hoc-signed binaries running on a
// machine that has Gatekeeper enabled are high-signal.
//
// Notes:
// - codesign verification is slow; we cache results by executable path
//   within the collector's module state for the lifetime of the process.
// - We skip kernel threads and Apple system processes that are always
//   code-signed by Apple (to save CPU).

'use strict';

const { run } = require('../shell');

const VERIFY_CACHE = new Map(); // executable path → verification result

const APPLE_TEAM_IDS = new Set([
  'Apple Mac OS Application Signing',
  'Software Signing',
  'Apple Inc.',
]);

async function enumProcesses() {
  const res = await run('/bin/ps', ['axo', 'pid,ppid,user,%cpu,%mem,comm'], { timeout: 6000 });
  if (res.code !== 0) return [];
  const lines = res.stdout.split('\n').slice(1);
  const out = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(\d+)\s+(\d+)\s+(\S+)\s+([\d.]+)\s+([\d.]+)\s+(.+)$/);
    if (!m) continue;
    const [, pid, ppid, user, cpu, mem, comm] = m;
    out.push({
      pid: parseInt(pid, 10),
      ppid: parseInt(ppid, 10),
      user,
      cpu: parseFloat(cpu),
      mem: parseFloat(mem),
      comm,
    });
  }
  return out;
}

async function verifyOne(execPath) {
  if (VERIFY_CACHE.has(execPath)) return VERIFY_CACHE.get(execPath);
  const res = await run('/usr/bin/codesign', ['-dv', '--verbose=2', execPath], { timeout: 6000 });
  // codesign writes its interesting output to stderr
  const out = (res.stderr || '') + (res.stdout || '');
  const isSigned = res.code === 0 && /Signature=/i.test(out) === false && /Authority=/.test(out);
  const adhoc = /Signature=adhoc/i.test(out);
  const teamMatch = out.match(/TeamIdentifier=(\S+)/);
  const authorityMatch = out.match(/Authority=(.+)/);
  const identifierMatch = out.match(/Identifier=(\S+)/);
  const result = {
    path: execPath,
    signed: res.code === 0 && !/not signed at all/i.test(out),
    adhoc,
    teamId: teamMatch ? teamMatch[1] : null,
    authority: authorityMatch ? authorityMatch[1] : null,
    identifier: identifierMatch ? identifierMatch[1] : null,
    apple: teamMatch ? APPLE_TEAM_IDS.has(teamMatch[1]) : /Apple/i.test(out),
    raw: out.trim(),
  };
  VERIFY_CACHE.set(execPath, result);
  return result;
}

async function collect({ limit = 400 } = {}) {
  const procs = await enumProcesses();
  // Dedup comm paths
  const uniquePaths = Array.from(new Set(
    procs
      .map(p => p.comm)
      .filter(c => c && c.startsWith('/'))
  )).slice(0, limit);

  const verifications = {};
  const unsigned = [];
  const adhoc = [];
  for (const p of uniquePaths) {
    const v = await verifyOne(p);
    verifications[p] = v;
    if (!v.signed) unsigned.push(v);
    else if (v.adhoc) adhoc.push(v);
  }

  // Build a summary process list with verification inline
  const processes = procs.map(p => ({
    ...p,
    verification: verifications[p.comm] || null,
  }));

  // Top CPU/mem offenders for quick UI rendering
  const topCpu = [...processes].sort((a, b) => b.cpu - a.cpu).slice(0, 15);
  const topMem = [...processes].sort((a, b) => b.mem - a.mem).slice(0, 15);

  return {
    processCount: processes.length,
    uniqueExecutables: uniquePaths.length,
    unsigned,
    adhoc,
    unsignedCount: unsigned.length,
    adhocCount: adhoc.length,
    topCpu,
    topMem,
    collectedAt: new Date().toISOString(),
  };
}

module.exports = { collect };
