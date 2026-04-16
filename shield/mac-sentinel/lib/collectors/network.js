// Network collector — LAN devices, Wi-Fi state, open sockets.
//
// Sources:
//   arp -an                    ARP cache (IP, MAC, interface)
//   networksetup -listallhardwareports
//   /usr/sbin/networksetup -getairportnetwork <iface>
//   /System/Library/.../airport -I   (deprecated in recent macOS but still present on many)
//   ifconfig                   interface addresses
//   lsof -i -n -P              listening + established sockets with process
//   route -n get default       default gateway
//   scutil --dns               DNS resolvers

'use strict';

const { run, runLines } = require('../shell');

const AIRPORT_BIN = '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport';

/**
 * Parse `arp -an` output. Example line:
 *   ? (192.168.1.1) at ac:de:48:00:11:22 on en0 ifscope [ethernet]
 */
function parseArp(stdout) {
  const devices = [];
  const re = /^\?\s+\(([\d.]+)\)\s+at\s+([0-9a-f:]+|\(incomplete\))\s+on\s+(\S+)/i;
  for (const line of stdout.split('\n')) {
    const m = line.trim().match(re);
    if (!m) continue;
    const [, ip, mac, iface] = m;
    if (mac === '(incomplete)') continue;
    devices.push({
      ip,
      mac: mac.toLowerCase(),
      iface,
      fingerprint: `${mac.toLowerCase()}@${iface}`,
    });
  }
  return devices;
}

/**
 * Parse `ifconfig` for interface names, MACs, IPv4 addresses, link status.
 */
function parseIfconfig(stdout) {
  const ifaces = {};
  let current = null;
  for (const line of stdout.split('\n')) {
    const ifaceMatch = line.match(/^(\w+\d*): flags=/);
    if (ifaceMatch) {
      current = ifaceMatch[1];
      ifaces[current] = { name: current, mac: null, ipv4: [], status: 'unknown' };
      continue;
    }
    if (!current) continue;
    const etherMatch = line.match(/^\s*ether\s+([0-9a-f:]+)/i);
    if (etherMatch) ifaces[current].mac = etherMatch[1].toLowerCase();
    const inetMatch = line.match(/^\s*inet\s+([\d.]+)\s/);
    if (inetMatch) ifaces[current].ipv4.push(inetMatch[1]);
    const statusMatch = line.match(/^\s*status:\s+(\w+)/);
    if (statusMatch) ifaces[current].status = statusMatch[1];
  }
  return ifaces;
}

/**
 * Parse `airport -I` which outputs key:value lines.
 */
function parseAirport(stdout) {
  const out = {};
  for (const line of stdout.split('\n')) {
    const m = line.match(/^\s*(\w+):\s*(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return {
    ssid: out.SSID || null,
    bssid: out.BSSID || null,
    channel: out.channel || null,
    rssi: out.agrCtlRSSI || null,
    noise: out.agrCtlNoise || null,
    linkAuth: out.linkAuth || null,
    state: out.state || null,
  };
}

/**
 * Parse `lsof -i -n -P` into structured entries.
 * Columns: COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
 */
function parseLsof(stdout) {
  const conns = [];
  const lines = stdout.split('\n').slice(1); // drop header
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 9) continue;
    const [cmd, pid, user, , , , , node, ...rest] = parts;
    const name = rest.join(' ');
    const state = name.includes('(LISTEN)') ? 'LISTEN'
                : name.includes('(ESTABLISHED)') ? 'ESTABLISHED'
                : name.includes('->') ? 'CONNECTED'
                : 'OTHER';
    conns.push({
      command: cmd,
      pid: parseInt(pid, 10) || null,
      user,
      proto: node,
      name,
      state,
    });
  }
  return conns;
}

/**
 * Find the Wi-Fi hardware port name from `networksetup -listallhardwareports`.
 */
function parseHardwarePorts(stdout) {
  const ports = {};
  const blocks = stdout.split(/\n\s*\n/);
  for (const block of blocks) {
    const nameMatch  = block.match(/Hardware Port:\s*(.+)/);
    const deviceMatch = block.match(/Device:\s*(\S+)/);
    const macMatch   = block.match(/Ethernet Address:\s*([0-9a-f:]+)/i);
    if (nameMatch && deviceMatch) {
      ports[nameMatch[1].trim()] = {
        port: nameMatch[1].trim(),
        device: deviceMatch[1].trim(),
        mac: macMatch ? macMatch[1].toLowerCase() : null,
      };
    }
  }
  return ports;
}

/**
 * Detect VPN clients and tunnel interfaces.
 * macOS VPN clients typically create a `utun<N>` or `tun<N>` interface.
 * Presence of one and an outbound route through it = a VPN is active.
 */
function detectVpn(ifaces, connections) {
  const tunnels = Object.values(ifaces).filter(i => /^(utun|tun|ppp|ipsec)/i.test(i.name) && i.status !== 'inactive');
  const active = tunnels.filter(t => t.ipv4.length > 0);
  // Known VPN / tunneling process names and ports (best-effort fingerprints).
  const vpnProcessHints = /\b(openvpn|wireguard|tailscaled|tailscale|mullvad|protonvpn|nordvpn|expressvpn|cisco|globalprotect|ipsec|racoon|strongswan)\b/i;
  const vpnProcs = connections.filter(c => vpnProcessHints.test(c.command || ''));
  const vpnPorts = connections.filter(c => /:(1194|500|4500|51820|1701|443)\b/.test(c.name || ''));
  return {
    tunnelInterfaces: tunnels.map(t => ({ name: t.name, ipv4: t.ipv4, status: t.status })),
    activeTunnel: active.length > 0,
    vpnProcesses: vpnProcs.slice(0, 20),
    knownVpnPortMatches: vpnPorts.slice(0, 50),
  };
}

/**
 * Scan nearby Wi-Fi APs via `airport -s`. Returns an array of
 * { ssid, bssid, rssi, channel, security } records. Used to detect
 * evil-twin access points — a rogue AP advertising your home SSID
 * with a different BSSID.
 *
 * Note: Apple has deprecated `airport -s` in recent macOS — the binary
 * still exists but the scan function may return an empty list without
 * Location Services permission. We handle both cases gracefully.
 */
async function scanNearbyAps() {
  const res = await run(AIRPORT_BIN, ['-s'], { timeout: 10000 });
  if (res.code !== 0 || !res.stdout) return { available: false, aps: [] };
  const lines = res.stdout.split('\n').slice(1); // drop header
  const aps = [];
  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    if (!line.trim()) continue;
    // airport -s columns: SSID BSSID RSSI CHANNEL HT CC SECURITY
    const m = line.match(/^\s*(.{1,32}?)\s+([0-9a-f:]{17})\s+(-?\d+)\s+(\S+)\s+\S+\s+(\S+)\s+(.+)$/i);
    if (!m) continue;
    aps.push({
      ssid: m[1].trim(),
      bssid: m[2].toLowerCase(),
      rssi: parseInt(m[3], 10),
      channel: m[4],
      cc: m[5],
      security: m[6].trim(),
    });
  }
  return { available: true, aps };
}

/**
 * Enumerate mDNS/Bonjour services broadcasting on the local link via
 * `dns-sd -B _services._dns-sd._udp local.`. We run it with a short
 * timeout and kill it — dns-sd is long-running by default.
 */
async function enumerateMdns() {
  const res = await run('/usr/bin/dns-sd', ['-t', '1', '-B', '_services._dns-sd._udp', 'local'], { timeout: 3500 });
  if (res.code !== 0 && !res.stdout) return { available: false, services: [] };
  const services = [];
  for (const raw of res.stdout.split('\n')) {
    const line = raw.trim();
    if (!line || /^Browsing for/.test(line) || /^DATE:/.test(line) || /^Timestamp/.test(line)) continue;
    const parts = line.split(/\s+/);
    // format: <Timestamp> Add/Rmv <Flags> <If> <Domain> <Type> <Instance>
    if (parts.length < 6) continue;
    services.push({
      op: parts[1],
      iface: parts[3],
      domain: parts[4],
      type: parts[5],
      instance: parts.slice(6).join(' ') || null,
    });
  }
  return { available: true, services };
}

async function collect() {
  const [arpRes, ifconfigRes, lsofRes, hwRes, routeRes, dnsRes] = await Promise.all([
    run('/usr/sbin/arp', ['-an']),
    run('/sbin/ifconfig', []),
    run('/usr/sbin/lsof', ['-i', '-n', '-P', '-l'], { timeout: 15000 }),
    run('/usr/sbin/networksetup', ['-listallhardwareports']),
    run('/sbin/route', ['-n', 'get', 'default']),
    run('/usr/sbin/scutil', ['--dns']),
  ]);

  const arpDevices = parseArp(arpRes.stdout);
  const ifaces = parseIfconfig(ifconfigRes.stdout);
  const hardwarePorts = parseHardwarePorts(hwRes.stdout);
  const connections = parseLsof(lsofRes.stdout);

  // Wi-Fi state — try airport first, fall back silently.
  let wifi = null;
  const airportRes = await run(AIRPORT_BIN, ['-I'], { timeout: 4000 });
  if (airportRes.code === 0 && airportRes.stdout) {
    wifi = parseAirport(airportRes.stdout);
  }

  // Attempt to also pull SSID via networksetup for the Wi-Fi port.
  const wifiPort = Object.values(hardwarePorts).find(p => /wi-?fi|airport/i.test(p.port));
  if (wifiPort) {
    const nsRes = await run('/usr/sbin/networksetup', ['-getairportnetwork', wifiPort.device], { timeout: 4000 });
    const nsMatch = nsRes.stdout.match(/Current Wi-Fi Network:\s*(.+)/);
    if (nsMatch) {
      wifi = wifi || {};
      wifi.ssid = wifi.ssid || nsMatch[1].trim();
      wifi.device = wifiPort.device;
    }
  }

  // Parse default gateway.
  let gateway = null;
  const gwMatch = routeRes.stdout.match(/gateway:\s*([\d.]+)/);
  if (gwMatch) gateway = gwMatch[1];
  const gwIface = routeRes.stdout.match(/interface:\s*(\S+)/);

  // Parse DNS resolvers (just the first resolver block).
  const dnsServers = [];
  for (const m of dnsRes.stdout.matchAll(/nameserver\[\d+\]\s*:\s*([\d.a-f:]+)/g)) {
    dnsServers.push(m[1]);
  }

  // Count LISTEN sockets for quick alerting.
  const listeners = connections.filter(c => c.state === 'LISTEN');

  // VPN / tunnel interfaces (utun, tun, ppp, ipsec) + suspicious processes.
  const vpn = detectVpn(ifaces, connections);

  // Rogue AP / evil-twin scan + mDNS enumeration (best-effort; depends
  // on macOS version and Location Services permission).
  const [nearbyScan, mdns] = await Promise.all([
    scanNearbyAps().catch(() => ({ available: false, aps: [] })),
    enumerateMdns().catch(() => ({ available: false, services: [] })),
  ]);

  return {
    arp: arpDevices,
    interfaces: ifaces,
    hardwarePorts,
    wifi,
    gateway,
    gatewayIface: gwIface ? gwIface[1] : null,
    dnsServers: Array.from(new Set(dnsServers)),
    connections,
    listeners,
    listenerCount: listeners.length,
    connectionCount: connections.length,
    vpn,
    nearbyAps: nearbyScan.aps || [],
    mdnsServices: mdns.services || [],
    collectedAt: new Date().toISOString(),
  };
}

module.exports = { collect, parseArp, parseIfconfig, parseAirport, parseLsof, parseHardwarePorts, detectVpn, scanNearbyAps, enumerateMdns };
