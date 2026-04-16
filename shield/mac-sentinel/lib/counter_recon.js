// SHIELD Mac Sentinel — counter-reconnaissance probe.
//
// When SHIELD detects an unknown device on the local network, we
// probe it BACK: reverse DNS, and a short TCP connect scan of the
// ports that remote-access tools commonly listen on. The whole
// operation is legal (your own network, your own property) and
// non-destructive (TCP connect, no SYN flood, no exploitation).
//
// What we look for:
//   22   SSH              — remote shell
//   80   HTTP             — web dashboard
//   443  HTTPS            — web dashboard (TLS)
//   445  SMB              — file sharing
//   548  AFP              — AppleShare file sharing
//   3283 ARD              — Apple Remote Desktop
//   3389 RDP              — Windows Remote Desktop
//   5900 VNC              — screen sharing
//   8080 HTTP alt         — web dashboard alt
//
// 5900, 3283, and 3389 open on an unknown LAN device = very high
// signal that it is a control machine. We escalate to HIGH.

'use strict';

const net = require('net');
const dns = require('dns');
const { run } = require('./shell');

const PROBE_PORTS = [22, 80, 443, 445, 548, 3283, 3389, 5900, 8080];
const REMOTE_ACCESS_PORTS = new Set([3283, 3389, 5900]);
const PROBE_TIMEOUT_MS = 1200;

function probePort(ip, port, timeoutMs = PROBE_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      try { socket.destroy(); } catch {}
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish({ port, open: true }));
    socket.once('timeout', () => finish({ port, open: false, reason: 'timeout' }));
    socket.once('error', (err) => finish({ port, open: false, reason: err.code || err.message }));
    try { socket.connect(port, ip); }
    catch (err) { finish({ port, open: false, reason: 'connect-throw' }); }
  });
}

async function reverseDns(ip) {
  return new Promise((resolve) => {
    dns.reverse(ip, (err, hostnames) => {
      if (err) return resolve({ ip, hostnames: null, error: err.code || err.message });
      resolve({ ip, hostnames });
    });
  });
}

async function mdnsLookup(ip) {
  // Try dns-sd for a reverse mDNS query — sometimes returns a local
  // device name when standard reverse DNS fails. Best-effort.
  const res = await run('/usr/bin/dns-sd', ['-q', `${ip.split('.').reverse().join('.')}.in-addr.arpa.`, 'PTR'], { timeout: 2500 });
  if (res.code !== 0) return null;
  const m = res.stdout.match(/PTR\s+(\S+)/);
  return m ? m[1] : null;
}

/**
 * Run a counter-recon probe against a single LAN IP.
 * @param {string} ip
 * @returns {Promise<{ip, hostnames, openPorts, remoteAccessOpen, osGuess, probedAt}>}
 */
async function probeDevice(ip) {
  // Basic sanity — only probe RFC1918 addresses. We refuse to
  // probe anything off-LAN even if the caller asks us to, because
  // that would put the user outside the safe-harbor scope.
  if (!/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)) {
    return { ip, error: 'not-rfc1918-refused' };
  }
  const [rev, mdns, ...portResults] = await Promise.all([
    reverseDns(ip),
    mdnsLookup(ip).catch(() => null),
    ...PROBE_PORTS.map(p => probePort(ip, p)),
  ]);
  const open = portResults.filter(r => r.open).map(r => r.port);
  const remoteOpen = open.filter(p => REMOTE_ACCESS_PORTS.has(p));
  // Crude OS/role guess from port signature.
  let role = 'unknown';
  if (open.includes(5900) && open.includes(22)) role = 'mac-or-linux-with-vnc';
  else if (open.includes(3389)) role = 'windows-rdp';
  else if (open.includes(3283)) role = 'mac-apple-remote-desktop';
  else if (open.includes(445) && open.includes(139)) role = 'windows-smb';
  else if (open.includes(548)) role = 'mac-afp';
  else if (open.includes(80) || open.includes(443)) role = 'has-web-ui';
  return {
    ip,
    hostnames: rev.hostnames,
    mdnsName: mdns,
    openPorts: open,
    remoteAccessOpen: remoteOpen,
    role,
    probedAt: new Date().toISOString(),
  };
}

module.exports = { probeDevice, PROBE_PORTS, REMOTE_ACCESS_PORTS };
