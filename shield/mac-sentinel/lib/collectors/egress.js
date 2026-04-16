// Network egress baseline collector.
//
// Upgrades the inline egress check that v1.2 had in analyzer.js into a
// proper collector with richer first-run baseline. Per process, we
// record:
//
//   - command
//   - pid
//   - user
//   - remote IP + port (parsed from lsof NAME column)
//   - codesign status (signed / unsigned / adhoc / apple)
//   - first-seen timestamp (from the baseline lock moment)
//
// The analyzer block in analyzer.js keeps its diffing logic but now
// operates on this richer record — so EGRESS_PROCESS_NEW events can
// differentiate HIGH (unsigned binary phoning home) from MEDIUM
// (signed vendor binary that was not in the baseline — common for
// updates and new app installs).

'use strict';

const { run } = require('../shell');

/**
 * Parse a single lsof line into a connection record.
 *   sshd 345 root 3u IPv4 0x... 0t0 TCP 10.0.0.5:22->1.2.3.4:55555 (ESTABLISHED)
 */
function parseLsofLine(line) {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 9) return null;
  const [command, pid, user, , , , , node, ...rest] = parts;
  const name = rest.join(' ');
  const stateMatch = name.match(/\((LISTEN|ESTABLISHED|CONNECTED|CLOSE_WAIT|SYN_SENT|TIME_WAIT|FIN_WAIT1|FIN_WAIT2)\)/);
  const state = stateMatch ? stateMatch[1] : 'OTHER';
  let localAddr = null, localPort = null, remoteAddr = null, remotePort = null;
  // NAME formats commonly seen:
  //   127.0.0.1:17333 (LISTEN)
  //   192.168.1.5:51234->1.2.3.4:443 (ESTABLISHED)
  //   [::1]:1234->[::1]:5678 (ESTABLISHED)
  const pairMatch = name.match(/^(\[?[\w.:]+\]?):(\w+)->(\[?[\w.:]+\]?):(\w+)/);
  if (pairMatch) {
    localAddr = pairMatch[1].replace(/^\[|\]$/g, '');
    localPort = pairMatch[2];
    remoteAddr = pairMatch[3].replace(/^\[|\]$/g, '');
    remotePort = pairMatch[4];
  } else {
    const singleMatch = name.match(/^(\[?[\w.:]+\]?):(\w+)/);
    if (singleMatch) {
      localAddr = singleMatch[1].replace(/^\[|\]$/g, '');
      localPort = singleMatch[2];
    }
  }
  return {
    command,
    pid: parseInt(pid, 10) || null,
    user,
    proto: node,
    state,
    localAddr,
    localPort,
    remoteAddr,
    remotePort,
    fingerprint: `${command}|${remoteAddr || ''}:${remotePort || ''}`,
    raw: line,
  };
}

const verifyCache = new Map();
async function verifyExecPath(execPath) {
  if (!execPath) return { signed: false, apple: false, adhoc: false };
  if (verifyCache.has(execPath)) return verifyCache.get(execPath);
  const res = await run('/usr/bin/codesign', ['-dv', '--verbose=2', execPath], { timeout: 5000 });
  const out = (res.stderr || '') + (res.stdout || '');
  const signed = !/not signed at all/i.test(out) && (/Authority=/.test(out) || /Signature=/.test(out));
  const adhoc = /Signature=adhoc/i.test(out);
  const teamMatch = out.match(/TeamIdentifier=(\S+)/);
  const apple = /Apple Root CA/.test(out) || /Authority=Software Signing/.test(out) || (teamMatch && teamMatch[1] === 'Software Signing');
  const result = { signed, adhoc, apple };
  verifyCache.set(execPath, result);
  return result;
}

async function resolveExecForPid(pid) {
  if (!pid) return null;
  // `ps -p <pid> -o comm=` prints the executable path.
  const res = await run('/bin/ps', ['-p', String(pid), '-o', 'comm='], { timeout: 3000 });
  if (res.code !== 0) return null;
  const p = res.stdout.trim();
  return p && p.startsWith('/') ? p : null;
}

async function collect({ includeListening = false } = {}) {
  const res = await run('/usr/sbin/lsof', ['-i', '-n', '-P', '-l'], { timeout: 15000 });
  if (res.code !== 0) return { available: false, connections: [], error: res.error };
  const lines = res.stdout.split('\n').slice(1).filter(Boolean);
  const parsed = lines.map(parseLsofLine).filter(Boolean);
  const outbound = parsed.filter(c => includeListening ? true : (c.state === 'ESTABLISHED' || c.state === 'CONNECTED'));

  // Augment each connection with the executable's codesign verdict.
  // Grouped by PID to avoid re-verifying the same binary for every
  // socket the process holds.
  const verdictByPid = new Map();
  for (const c of outbound) {
    if (!c.pid) continue;
    if (!verdictByPid.has(c.pid)) {
      const execPath = await resolveExecForPid(c.pid);
      const verdict = execPath ? await verifyExecPath(execPath) : { signed: null, adhoc: null, apple: null };
      verdictByPid.set(c.pid, { execPath, ...verdict });
    }
  }
  for (const c of outbound) {
    const v = verdictByPid.get(c.pid);
    if (v) {
      c.execPath = v.execPath;
      c.signed = v.signed;
      c.adhoc = v.adhoc;
      c.apple = v.apple;
    }
  }

  // Build a per-process fingerprint set for cheap diffing
  const byProcess = {};
  for (const c of outbound) {
    const key = c.command || 'unknown';
    if (!byProcess[key]) byProcess[key] = { count: 0, samples: [], signed: null, adhoc: null, apple: null };
    byProcess[key].count++;
    if (c.signed != null) byProcess[key].signed = c.signed;
    if (c.adhoc != null) byProcess[key].adhoc = c.adhoc;
    if (c.apple != null) byProcess[key].apple = c.apple;
    if (byProcess[key].samples.length < 5) {
      byProcess[key].samples.push({
        remote: c.remoteAddr ? `${c.remoteAddr}:${c.remotePort}` : null,
        local: c.localAddr ? `${c.localAddr}:${c.localPort}` : null,
      });
    }
  }

  return {
    available: true,
    connections: outbound,
    byProcess,
    count: outbound.length,
    collectedAt: new Date().toISOString(),
  };
}

module.exports = { collect, parseLsofLine };
