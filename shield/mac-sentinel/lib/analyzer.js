// SHIELD Mac Sentinel — analyzer.
//
// Takes a snapshot from all collectors, compares it against the previous
// snapshot and a rolling baseline, and emits an array of events to be
// appended to the ledger.
//
// Event shape (before ledger wraps it):
//   { type, severity, payload }

'use strict';

/**
 * Shallow-safe array dedup by a key function.
 */
function uniqBy(arr, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const k = keyFn(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function diffKeyed(prev, curr, keyFn) {
  const prevMap = new Map((prev || []).map(i => [keyFn(i), i]));
  const currMap = new Map((curr || []).map(i => [keyFn(i), i]));
  const added = [];
  const removed = [];
  for (const [k, v] of currMap) if (!prevMap.has(k)) added.push(v);
  for (const [k, v] of prevMap) if (!currMap.has(k)) removed.push(v);
  return { added, removed };
}

// Rate-limit signature: type + canonicalJSON(payload without volatile fields).
// If the same signature fires within the window, we suppress non-CRITICAL
// re-emission so the alert feed stays useful.
const RATE_LIMIT_MS = 60 * 60 * 1000; // 1 hour
function signatureFor(e) {
  const payload = { ...(e.payload || {}) };
  // Drop volatile fields that would defeat dedup
  delete payload.collectedAt;
  delete payload.ts;
  return e.type + '|' + JSON.stringify(payload, Object.keys(payload).sort());
}
function shouldEmit(e, rateLimiter) {
  if (e.severity === 'CRITICAL') return true;
  const sig = signatureFor(e);
  const last = rateLimiter.get(sig);
  if (last && Date.now() - last < RATE_LIMIT_MS) return false;
  rateLimiter.set(sig, Date.now());
  return true;
}

function analyze(snapshot, previous, state) {
  const events = [];
  const now = new Date().toISOString();

  // The scan itself.
  events.push({
    type: 'SCAN',
    severity: 'INFO',
    payload: {
      collectedAt: now,
      wifiSsid: snapshot.network?.wifi?.ssid || null,
      arpDeviceCount: snapshot.network?.arp?.length || 0,
      btDeviceCount: snapshot.bluetooth?.deviceCount ?? 0,
      processCount: snapshot.processes?.processCount ?? 0,
      unsignedCount: snapshot.processes?.unsignedCount ?? 0,
    },
  });

  // ─── Integrity posture ─────────────────────────────────────────────
  if (snapshot.integrity) {
    const ig = snapshot.integrity;
    if (ig.lockdownMode && ig.lockdownMode.enabled === false) {
      events.push({ type: 'LOCKDOWN_OFF', severity: 'HIGH', payload: { message: 'Lockdown Mode is OFF on this Mac.' } });
    }
    if (ig.fileVault && ig.fileVault.enabled === false) {
      events.push({ type: 'FILEVAULT_OFF', severity: 'CRITICAL', payload: { message: 'FileVault is OFF — disk contents unencrypted at rest.', raw: ig.fileVault.raw } });
    }
    if (ig.sip && ig.sip.enabled === false) {
      events.push({ type: 'SIP_OFF', severity: 'CRITICAL', payload: { message: 'System Integrity Protection is DISABLED.', raw: ig.sip.raw } });
    }
    if (ig.gatekeeper && ig.gatekeeper.enabled === false) {
      events.push({ type: 'GATEKEEPER_OFF', severity: 'HIGH', payload: { message: 'Gatekeeper assessments are disabled.', raw: ig.gatekeeper.raw } });
    }
    if (ig.firewall && ig.firewall.enabled === false) {
      events.push({ type: 'FIREWALL_OFF', severity: 'HIGH', payload: { message: 'Application firewall is OFF.', raw: ig.firewall.raw } });
    }
    // TCC database change — possible privacy permission grant.
    if (previous?.integrity?.tcc?.userHash && ig.tcc?.userHash && previous.integrity.tcc.userHash !== ig.tcc.userHash) {
      events.push({
        type: 'TCC_CHANGE',
        severity: 'MEDIUM',
        payload: { message: 'TCC privacy database changed — a new app may have been granted Full Disk Access, Screen Recording, or similar.', prevMtime: previous.integrity.tcc.userMtime, currMtime: ig.tcc.userMtime },
      });
    }
  }

  // ─── Configuration Profiles ────────────────────────────────────────
  if (snapshot.profiles) {
    const pf = snapshot.profiles;
    if (pf.anyInstalled) {
      events.push({
        type: 'PROFILE_PRESENT',
        severity: 'CRITICAL',
        payload: {
          message: 'Configuration Profile(s) installed on this Mac. If you did not install these yourself, this is a persistence foothold. Review System Settings → Privacy & Security → Profiles.',
          userCount: pf.userProfileCount,
          allCount: pf.allProfileCount,
          profiles: pf.allProfiles,
        },
      });
    }
    if (previous?.profiles) {
      const prevCount = previous.profiles.allProfileCount || 0;
      const currCount = pf.allProfileCount || 0;
      if (currCount > prevCount) {
        events.push({
          type: 'PROFILE_CHANGE',
          severity: 'CRITICAL',
          payload: { message: `Profile count increased from ${prevCount} to ${currCount}.`, profiles: pf.allProfiles },
        });
      } else if (currCount < prevCount) {
        events.push({
          type: 'PROFILE_CHANGE',
          severity: 'MEDIUM',
          payload: { message: `Profile count decreased from ${prevCount} to ${currCount}.`, profiles: pf.allProfiles },
        });
      }
    }
    // Managed Preferences directory change
    if (previous?.profiles?.managedPrefs && pf.managedPrefs) {
      const prevFiles = (previous.profiles.managedPrefs.files || []).map(f => f.name + ':' + (f.hash || ''));
      const currFiles = (pf.managedPrefs.files || []).map(f => f.name + ':' + (f.hash || ''));
      const prevSet = new Set(prevFiles);
      const currSet = new Set(currFiles);
      const newOrChanged = currFiles.filter(f => !prevSet.has(f));
      const removed = prevFiles.filter(f => !currSet.has(f));
      if (newOrChanged.length || removed.length) {
        events.push({
          type: 'MANAGED_PREFS_CHANGE',
          severity: 'HIGH',
          payload: { newOrChanged, removed },
        });
      }
    }
  }

  // ─── LaunchAgents / LaunchDaemons ──────────────────────────────────
  if (snapshot.launchAgents?.paths) {
    const currPaths = snapshot.launchAgents.paths;
    const prevPaths = previous?.launchAgents?.paths || {};
    for (const [dir, info] of Object.entries(currPaths)) {
      if (!info.critical) continue; // Skip Apple-owned read-only dirs for add/remove events; still hash-watched below.
      const prev = prevPaths[dir]?.entries || [];
      const curr = info.entries || [];
      const { added, removed } = diffKeyed(prev, curr, e => e.file);
      for (const a of added) {
        events.push({
          type: 'LAUNCHAGENT_NEW',
          severity: 'CRITICAL',
          payload: {
            message: `New LaunchAgent/Daemon created: ${a.file}`,
            entry: a,
            dir,
          },
        });
      }
      for (const r of removed) {
        events.push({
          type: 'LAUNCHAGENT_REMOVED',
          severity: 'MEDIUM',
          payload: { message: `LaunchAgent/Daemon removed: ${r.file}`, entry: r, dir },
        });
      }
      // Hash drift for unchanged entries
      const prevByFile = new Map(prev.map(e => [e.file, e]));
      for (const c of curr) {
        const p = prevByFile.get(c.file);
        if (p && p.hash && c.hash && p.hash !== c.hash) {
          events.push({
            type: 'LAUNCHAGENT_MODIFIED',
            severity: 'HIGH',
            payload: { message: `LaunchAgent/Daemon modified in place: ${c.file}`, prevHash: p.hash, newHash: c.hash, entry: c, dir },
          });
        }
      }
    }
    // Apple-signed dirs: surface any drift as MEDIUM (could be legit update)
    for (const [dir, info] of Object.entries(currPaths)) {
      if (info.critical) continue;
      const prev = prevPaths[dir]?.entries || [];
      const curr = info.entries || [];
      const { added, removed } = diffKeyed(prev, curr, e => e.file);
      if (added.length || removed.length) {
        events.push({
          type: 'APPLE_LAUNCHAGENT_DRIFT',
          severity: 'LOW',
          payload: { dir, addedCount: added.length, removedCount: removed.length },
        });
      }
    }
  }

  // ─── Login Items ───────────────────────────────────────────────────
  if (snapshot.loginItems) {
    const prev = previous?.loginItems?.classic?.items || [];
    const curr = snapshot.loginItems.classic?.items || [];
    const { added, removed } = diffKeyed(prev, curr, i => i.path || i.name);
    for (const a of added) {
      events.push({ type: 'LOGIN_ITEM_NEW', severity: 'HIGH', payload: { item: a } });
    }
    for (const r of removed) {
      events.push({ type: 'LOGIN_ITEM_REMOVED', severity: 'LOW', payload: { item: r } });
    }
    // Background items database change
    const prevDb = previous?.loginItems?.backgroundDb?.files || [];
    const currDb = snapshot.loginItems.backgroundDb?.files || [];
    const prevHashes = new Set(prevDb.map(f => f.name + ':' + f.hash));
    const currHashes = currDb.map(f => f.name + ':' + f.hash);
    const newDbEntries = currHashes.filter(h => !prevHashes.has(h));
    if (newDbEntries.length) {
      events.push({
        type: 'BG_ITEM_DB_CHANGE',
        severity: 'MEDIUM',
        payload: { message: 'Background items database changed — a login item was added or modified.', entries: newDbEntries },
      });
    }
  }

  // ─── Sharing services ──────────────────────────────────────────────
  if (snapshot.sharing) {
    const active = snapshot.sharing.active || [];
    for (const svc of active) {
      events.push({
        type: 'SHARING_ACTIVE',
        severity: 'MEDIUM',
        payload: { service: svc.label, underlying: svc.svc, scope: svc.scope, message: `${svc.label} is running. If you did not enable it, this may be a backdoor.` },
      });
    }
    // Newly active sharing service
    if (previous?.sharing) {
      const prevActive = new Set((previous.sharing.active || []).map(s => s.svc));
      const newlyActive = active.filter(s => !prevActive.has(s.svc));
      for (const svc of newlyActive) {
        events.push({ type: 'SHARING_ENABLED', severity: 'HIGH', payload: { service: svc.label, underlying: svc.svc } });
      }
    }
  }

  // ─── Network anomalies ─────────────────────────────────────────────
  if (snapshot.network) {
    const net = snapshot.network;
    const prevNet = previous?.network || {};

    // SSID change
    if (prevNet.wifi?.ssid && net.wifi?.ssid && prevNet.wifi.ssid !== net.wifi.ssid) {
      events.push({
        type: 'SSID_CHANGE',
        severity: 'MEDIUM',
        payload: { prev: prevNet.wifi.ssid, curr: net.wifi.ssid },
      });
    }
    // Gateway change
    if (prevNet.gateway && net.gateway && prevNet.gateway !== net.gateway) {
      events.push({
        type: 'GATEWAY_CHANGE',
        severity: 'HIGH',
        payload: { prev: prevNet.gateway, curr: net.gateway, message: 'Default gateway changed. Possible network hijack or rogue AP.' },
      });
    }
    // DNS resolver change — HIGH severity. Controlling DNS = controlling
    // where every HTTPS connection actually lands. Baseline is locked
    // at first run (stored in state.dnsBaseline) and any drift from
    // THAT baseline stays HIGH until the user explicitly re-baselines.
    if (!state.dnsBaseline && net.dnsServers?.length) {
      state.dnsBaseline = [...net.dnsServers].sort();
    }
    if (state.dnsBaseline && net.dnsServers) {
      const baselineStr = JSON.stringify(state.dnsBaseline);
      const currStr = JSON.stringify([...net.dnsServers].sort());
      if (baselineStr !== currStr) {
        events.push({
          type: 'DNS_BASELINE_DRIFT',
          severity: 'HIGH',
          payload: {
            baseline: state.dnsBaseline,
            curr: net.dnsServers,
            message: 'DNS resolvers have drifted from the locked baseline. Every HTTPS connection starts with a DNS lookup — control DNS, control destination.',
          },
        });
      }
    }
    // Also alert on transient change between two adjacent scans (catches
    // brief hijacks that revert before baseline re-lock).
    if (prevNet.dnsServers && net.dnsServers) {
      const prevDns = JSON.stringify([...prevNet.dnsServers].sort());
      const currDns = JSON.stringify([...net.dnsServers].sort());
      if (prevDns !== currDns) {
        events.push({ type: 'DNS_CHANGE', severity: 'HIGH', payload: { prev: prevNet.dnsServers, curr: net.dnsServers } });
      }
    }

    // Rogue AP / evil-twin detection: if the current SSID we're on
    // appears in the nearby-AP scan with a BSSID that does not match
    // the one we're connected to, that's an evil twin. Also lock a
    // BSSID baseline per SSID so we detect impersonation even off-home.
    if (net.wifi?.ssid && net.wifi?.bssid && net.nearbyAps?.length) {
      const ourSsid = net.wifi.ssid;
      const ourBssid = (net.wifi.bssid || '').toLowerCase();
      state.apBaseline = state.apBaseline || {};
      if (!state.apBaseline[ourSsid]) state.apBaseline[ourSsid] = ourBssid;
      const baseline = state.apBaseline[ourSsid];
      // Anyone else advertising our SSID on a different BSSID?
      for (const ap of net.nearbyAps) {
        if (ap.ssid === ourSsid && ap.bssid && ap.bssid !== ourBssid) {
          events.push({
            type: 'EVIL_TWIN_AP',
            severity: 'CRITICAL',
            payload: { ssid: ourSsid, ourBssid, rogueBssid: ap.bssid, rogueRssi: ap.rssi, rogueChannel: ap.channel, rogueSecurity: ap.security, message: `Another access point is advertising your SSID "${ourSsid}" with a different BSSID. This is an evil-twin attack.` },
          });
        }
      }
      if (baseline && baseline !== ourBssid) {
        events.push({
          type: 'BSSID_DRIFT',
          severity: 'HIGH',
          payload: { ssid: ourSsid, baselineBssid: baseline, currentBssid: ourBssid, message: `BSSID for "${ourSsid}" changed from the baseline. Either your router was replaced or you are on an impersonator AP.` },
        });
      }
    }

    // mDNS service drift — a raspberry pi on your network suddenly
    // advertising new services is a very high-signal LAN implant.
    if (net.mdnsServices && previous?.network?.mdnsServices) {
      const prevTypes = new Set(previous.network.mdnsServices.map(s => `${s.type}@${s.iface}`));
      const novel = (net.mdnsServices || []).filter(s => !prevTypes.has(`${s.type}@${s.iface}`));
      for (const svc of novel) {
        events.push({
          type: 'MDNS_SERVICE_NEW',
          severity: 'MEDIUM',
          payload: { service: svc, message: `New Bonjour/mDNS service advertised on local link: ${svc.type}` },
        });
      }
    }

    // Egress baseline — now driven by the dedicated egress collector
    // which carries richer per-process data (codesign verdicts, remote
    // IP/port samples). The baseline is a map of command -> { first
    // seen timestamp, signed/adhoc/apple verdict }. Diffing fires
    // EGRESS_PROCESS_NEW HIGH for unsigned/adhoc and MEDIUM for signed.
    // Legacy path: if we have snapshot.network.connections but no
    // dedicated egress collector, we fall through to the old logic.
    const eg = snapshot.egress;
    if (eg && eg.available && eg.byProcess) {
      state.egressBaseline = state.egressBaseline || null;
      if (state.egressBaseline === null) {
        // First run: lock baseline silently. Includes codesign verdict.
        const baseline = {};
        for (const [proc, info] of Object.entries(eg.byProcess)) {
          baseline[proc] = {
            firstSeen: now,
            signed: info.signed,
            adhoc: info.adhoc,
            apple: info.apple,
            count: info.count,
          };
        }
        state.egressBaseline = baseline;
      } else {
        for (const [proc, info] of Object.entries(eg.byProcess)) {
          if (!(proc in state.egressBaseline)) {
            const suspicious = info.signed === false || info.adhoc === true;
            const severity = suspicious ? 'HIGH' : 'MEDIUM';
            events.push({
              type: 'EGRESS_PROCESS_NEW',
              severity,
              payload: {
                process: proc,
                count: info.count,
                signed: info.signed,
                adhoc: info.adhoc,
                apple: info.apple,
                samples: info.samples,
                message: `New process making outbound connections: ${proc}${suspicious ? ' (unsigned/adhoc-signed)' : ''}`,
              },
            });
            state.egressBaseline[proc] = {
              firstSeen: now,
              signed: info.signed,
              adhoc: info.adhoc,
              apple: info.apple,
              count: info.count,
            };
          }
        }
      }
    }
    // ARP: new devices on LAN
    if (net.arp) {
      const whitelist = new Set((state.whitelist?.network || []).map(d => d.fingerprint || d.mac));
      const prevFp = new Set((prevNet.arp || []).map(d => d.fingerprint));
      const currFp = uniqBy(net.arp, d => d.fingerprint);
      for (const d of currFp) {
        if (whitelist.has(d.fingerprint) || whitelist.has(d.mac)) continue;
        if (!prevFp.has(d.fingerprint)) {
          events.push({
            type: 'DEVICE_NEW',
            severity: 'LOW',
            payload: { device: d, scope: 'network', message: 'New device seen on LAN' },
          });
        }
      }
      // MAC-IP binding changes (possible ARP spoof)
      const prevByIp = new Map((prevNet.arp || []).map(d => [d.ip, d.mac]));
      for (const d of net.arp) {
        const prevMac = prevByIp.get(d.ip);
        if (prevMac && prevMac !== d.mac) {
          events.push({
            type: 'ARP_ANOMALY',
            severity: 'HIGH',
            payload: { ip: d.ip, prevMac, newMac: d.mac, message: 'MAC address changed for IP — possible ARP spoofing.' },
          });
        }
      }
    }
    // New listening sockets
    if (net.listeners && prevNet.listeners) {
      const key = l => `${l.proto}:${l.name}:${l.command}`;
      const prevKeys = new Set(prevNet.listeners.map(key));
      const newListeners = net.listeners.filter(l => !prevKeys.has(key(l)));
      for (const l of newListeners) {
        events.push({
          type: 'LISTENER_NEW',
          severity: 'MEDIUM',
          payload: { listener: l, message: `New listening socket: ${l.command} on ${l.name}` },
        });
      }
    }
  }

  // ─── Bluetooth anomalies ───────────────────────────────────────────
  if (snapshot.bluetooth?.available) {
    const bt = snapshot.bluetooth;
    const prevBt = previous?.bluetooth || {};
    const whitelist = new Set((state.whitelist?.bluetooth || []).map(d => (d.address || '').toLowerCase()));

    if (bt.discoverable) {
      events.push({
        type: 'BT_DISCOVERABLE',
        severity: 'MEDIUM',
        payload: { message: 'Bluetooth controller is in discoverable mode. Disable from System Settings.' },
      });
    }

    const prevAddrs = new Set((prevBt.devices || []).map(d => d.address));
    for (const d of bt.devices || []) {
      if (whitelist.has(d.address)) continue;
      if (!prevAddrs.has(d.address)) {
        const severity = d.connected ? 'HIGH' : 'LOW';
        events.push({
          type: 'BT_DEVICE_NEW',
          severity,
          payload: { device: d, message: d.connected ? 'New Bluetooth device is CONNECTED right now.' : 'New Bluetooth device seen.' },
        });
      }
    }
  }

  // ─── Process integrity ────────────────────────────────────────────
  if (snapshot.processes) {
    const unsigned = snapshot.processes.unsigned || [];
    if (unsigned.length > 0) {
      events.push({
        type: 'PROCESS_UNSIGNED',
        severity: 'HIGH',
        payload: {
          count: unsigned.length,
          paths: unsigned.map(u => u.path),
          message: `${unsigned.length} unsigned binary(ies) running. Review each — unsigned code running with Gatekeeper enabled is suspicious.`,
        },
      });
    }
  }

  // ─── Auth / login anomalies ───────────────────────────────────────
  if (snapshot.logins) {
    const fails = snapshot.logins.authFailureCount || 0;
    if (fails >= 5) {
      events.push({
        type: 'AUTH_FAILURES',
        severity: 'HIGH',
        payload: { count: fails, message: `${fails} authentication failure(s) in the last hour.` },
      });
    }
  }

  // ─── Canary files ─────────────────────────────────────────────────
  if (snapshot.canaries?.canaries) {
    const prev = previous?.canaries?.canaries || [];
    const prevById = new Map(prev.map(c => [c.id, c]));
    for (const c of snapshot.canaries.canaries) {
      if (!c.exists) {
        events.push({
          type: 'CANARY_REMOVED',
          severity: 'CRITICAL',
          payload: { id: c.id, label: c.label, path: c.path, message: `Canary file removed: ${c.label}. Nothing legitimate touches this file. An adversary was in the filesystem.` },
        });
        continue;
      }
      const p = prevById.get(c.id);
      if (p && p.exists && p.hash && c.hash && p.hash !== c.hash) {
        events.push({
          type: 'CANARY_MODIFIED',
          severity: 'CRITICAL',
          payload: { id: c.id, label: c.label, path: c.path, prevHash: p.hash, newHash: c.hash, message: `Canary file modified: ${c.label}.` },
        });
      } else if (p && p.exists && p.atime && c.atime && p.atime !== c.atime && p.mtime === c.mtime) {
        // Access time advanced without modification — someone opened it.
        // Only emit if we trust atime (APFS with relatime does track it).
        events.push({
          type: 'CANARY_ACCESSED',
          severity: 'MEDIUM',
          payload: { id: c.id, label: c.label, path: c.path, prevAtime: p.atime, newAtime: c.atime, message: `Canary file was read-accessed.` },
        });
      }
    }
  }

  // ─── USB devices ──────────────────────────────────────────────────
  if (snapshot.usb?.available) {
    const prev = previous?.usb?.devices || [];
    const prevFp = new Set(prev.map(d => d.fingerprint).filter(Boolean));
    const whitelist = new Set((state.whitelist?.usb || []).map(d => d.fingerprint || ''));
    for (const d of snapshot.usb.devices || []) {
      if (!d.fingerprint) continue;
      if (whitelist.has(d.fingerprint)) continue;
      if (!prevFp.has(d.fingerprint)) {
        // iPhone connections get a dedicated event type so the runner
        // can start a cross-infection watch timer.
        if (d.isIphone) {
          events.push({
            type: 'IPHONE_CONNECTED',
            severity: 'MEDIUM',
            payload: { device: d, message: `iPhone connected via USB: ${d.name}. Starting 60-second cross-infection watch.` },
          });
        } else {
          events.push({
            type: 'USB_DEVICE_NEW',
            severity: 'MEDIUM',
            payload: { device: d, message: `New USB device: ${d.name || 'unknown'} (${d.vendorId || '?'}:${d.productId || '?'})` },
          });
        }
      }
    }
  }

  // ─── Honeypots (Part 3) ───────────────────────────────────────────
  if (snapshot.honeypots?.honeypots) {
    const prevMap = new Map((previous?.honeypots?.honeypots || []).map(h => [h.id, h]));
    for (const hp of snapshot.honeypots.honeypots) {
      const p = prevMap.get(hp.id);
      if (!p) continue; // first-run baseline only
      if (p.exists && !hp.exists) {
        events.push({
          type: 'HONEYPOT_REMOVED',
          severity: 'CRITICAL',
          payload: { id: hp.id, label: hp.label, path: hp.path, message: `Honeypot removed: ${hp.label}. Nothing legitimate touches this file.` },
        });
      } else if (p.exists && hp.exists && p.hash && hp.hash && p.hash !== hp.hash) {
        events.push({
          type: 'HONEYPOT_MODIFIED',
          severity: 'CRITICAL',
          payload: { id: hp.id, label: hp.label, path: hp.path, message: `Honeypot file content changed: ${hp.label}. Someone wrote to a file they have no reason to know exists.` },
        });
      } else if (p.exists && hp.exists && p.atime && hp.atime && p.atime !== hp.atime && p.mtime === hp.mtime) {
        events.push({
          type: 'HONEYPOT_ACCESSED',
          severity: 'CRITICAL',
          payload: { id: hp.id, label: hp.label, path: hp.path, prevAtime: p.atime, newAtime: hp.atime, message: `Honeypot file READ: ${hp.label}. An unknown process opened a decoy.` },
        });
      }
    }
  }

  // ─── Shell RC files (bonus collector) ─────────────────────────────
  if (snapshot.shellRc?.files) {
    const prevMap = new Map((previous?.shellRc?.files || []).map(f => [f.path, f]));
    for (const curr of snapshot.shellRc.files) {
      const p = prevMap.get(curr.path);
      if (!p) continue;
      if (p.hash && curr.hash && p.hash !== curr.hash) {
        events.push({
          type: 'SHELL_RC_MODIFIED',
          severity: 'HIGH',
          payload: { path: curr.path, prevHash: p.hash, newHash: curr.hash, firstLines: curr.firstLines, lastLines: curr.lastLines, message: `Shell startup file modified: ${curr.path}. A single added line can re-establish attacker access every time you open a terminal.` },
        });
      }
    }
  }

  // ─── Installer receipts (bonus collector) ─────────────────────────
  if (snapshot.installerReceipts?.available) {
    const p = previous?.installerReceipts;
    if (p && p.available && p.count != null && snapshot.installerReceipts.count > p.count) {
      const newEntries = (snapshot.installerReceipts.receipts || []).slice(-(snapshot.installerReceipts.count - p.count));
      events.push({
        type: 'INSTALLER_RECEIPT_NEW',
        severity: 'HIGH',
        payload: { count: snapshot.installerReceipts.count - p.count, newEntries, message: `${snapshot.installerReceipts.count - p.count} new macOS installer receipt(s). Someone ran a .pkg. Verify it was you.` },
      });
    }
  }

  // ─── App bundle integrity (v2.2) ──────────────────────────────────
  if (snapshot.appBundles?.bundles) {
    const prevMap = new Map((previous?.appBundles?.bundles || []).map(b => [b.path, b]));
    for (const curr of snapshot.appBundles.bundles) {
      const p = prevMap.get(curr.path);
      if (!p) continue; // first-run baseline only
      // Executable hash change — the most important signal. App updates
      // normally change the executable hash, but they should ALSO change
      // the signing identity or team ID to the vendor's new signing cert
      // at the very least, and the mtime. We fire HIGH on any exec hash
      // drift and let the user review.
      if (p.execHash && curr.execHash && p.execHash !== curr.execHash && curr.execHash !== 'SKIPPED_TOO_LARGE') {
        const identityChanged = p.identity !== curr.identity || p.teamId !== curr.teamId;
        events.push({
          type: 'APP_BUNDLE_MODIFIED',
          severity: identityChanged ? 'CRITICAL' : 'HIGH',
          payload: {
            app: curr.name,
            path: curr.path,
            prevHash: p.execHash,
            newHash: curr.execHash,
            prevIdentity: p.identity,
            newIdentity: curr.identity,
            prevTeamId: p.teamId,
            newTeamId: curr.teamId,
            identityChanged,
            message: identityChanged
              ? `App executable AND signing identity both changed for ${curr.name}. This is the fingerprint of a replaced bundle, not a legitimate update.`
              : `App executable hash changed for ${curr.name}. Verify this was a legitimate update by checking the vendor's release notes and the app's About menu.`,
          },
        });
      }
      // Info.plist-only changes are lower severity — common for version bumps.
      if (p.infoPlistHash && curr.infoPlistHash && p.infoPlistHash !== curr.infoPlistHash && p.execHash === curr.execHash) {
        events.push({
          type: 'APP_BUNDLE_METADATA_CHANGED',
          severity: 'LOW',
          payload: { app: curr.name, path: curr.path },
        });
      }
    }
  }

  // ─── Input methods / keyboards (v2.2) ─────────────────────────────
  if (snapshot.inputSources?.paths) {
    const prevPaths = previous?.inputSources?.paths || {};
    for (const [dir, info] of Object.entries(snapshot.inputSources.paths)) {
      const prev = prevPaths[dir]?.entries || [];
      const prevByName = new Map(prev.map(e => [e.name, e]));
      for (const entry of info.entries || []) {
        const p = prevByName.get(entry.name);
        if (!p) {
          events.push({
            type: 'INPUT_METHOD_NEW',
            severity: 'HIGH',
            payload: { dir, entry, message: `New input method/keyboard installed at ${entry.path}. A malicious IME sees every keystroke on the entire system.` },
          });
        } else if (p.infoHash && entry.infoHash && p.infoHash !== entry.infoHash) {
          events.push({
            type: 'INPUT_METHOD_MODIFIED',
            severity: 'HIGH',
            payload: { dir, entry, prevHash: p.infoHash, newHash: entry.infoHash },
          });
        }
      }
    }
  }

  // ─── Secure Boot policy (Apple Silicon, v2.2) ─────────────────────
  if (snapshot.secureBoot?.isAppleSilicon && snapshot.secureBoot?.available) {
    if (snapshot.secureBoot.fullSecurity === false) {
      events.push({
        type: 'SECUREBOOT_REDUCED',
        severity: 'CRITICAL',
        payload: {
          securityMode: snapshot.secureBoot.securityMode,
          kextPolicy: snapshot.secureBoot.kextPolicy,
          bootPolicy: snapshot.secureBoot.bootPolicy,
          message: `Apple Silicon Secure Boot is NOT in Full Security mode (current: ${snapshot.secureBoot.securityMode}). This permits unsigned kexts and custom kernel collections. An attacker who can lower secureboot policy owns the boot chain.`,
        },
      });
    }
    // Drift from previous scan is also CRITICAL.
    if (previous?.secureBoot?.fullSecurity === true && snapshot.secureBoot.fullSecurity === false) {
      events.push({
        type: 'SECUREBOOT_LOWERED',
        severity: 'CRITICAL',
        payload: {
          prevMode: previous.secureBoot.securityMode,
          curMode: snapshot.secureBoot.securityMode,
          message: 'Secure Boot policy was just lowered. This requires recovery mode and an admin password. Either you did it, or someone has physical access to your Mac.',
        },
      });
    }
  }

  // ─── VPN / tunnel state ───────────────────────────────────────────
  if (snapshot.network?.vpn) {
    const vpn = snapshot.network.vpn;
    const prevVpn = previous?.network?.vpn;
    if (vpn.activeTunnel && (!prevVpn || !prevVpn.activeTunnel)) {
      events.push({
        type: 'VPN_TUNNEL_UP',
        severity: 'LOW',
        payload: { interfaces: vpn.tunnelInterfaces, message: 'A tunnel interface became active. If you started a VPN client, this is expected.' },
      });
    }
    if (!vpn.activeTunnel && prevVpn?.activeTunnel) {
      events.push({
        type: 'VPN_TUNNEL_DOWN',
        severity: 'LOW',
        payload: { message: 'Tunnel interface went away.' },
      });
    }
    // New VPN/tunnel-speaking process you didn't have before
    const prevProcNames = new Set((prevVpn?.vpnProcesses || []).map(p => p.command));
    for (const p of vpn.vpnProcesses || []) {
      if (!prevProcNames.has(p.command)) {
        events.push({
          type: 'VPN_PROCESS_NEW',
          severity: 'MEDIUM',
          payload: { process: p, message: `New VPN-speaking process: ${p.command}. If you did not start a VPN client, this may be a reverse tunnel.` },
        });
      }
    }
  }

  // ─── Wi-Fi deauth / disassoc ──────────────────────────────────────
  if (snapshot.wifiDeauth?.available) {
    const wd = snapshot.wifiDeauth;
    if (wd.disassocCount >= 3) {
      events.push({
        type: 'WIFI_DEAUTH_STORM',
        severity: 'HIGH',
        payload: {
          count: wd.disassocCount,
          samples: wd.disassocLines?.slice(-10),
          message: `${wd.disassocCount} disassociation events in the last 5 minutes. Textbook WPA handshake capture pattern — someone may be deauth-ing you to crack your Wi-Fi PSK.`,
        },
      });
    }
    if (wd.authFailCount >= 2) {
      events.push({
        type: 'WIFI_AUTH_FAIL',
        severity: 'MEDIUM',
        payload: { count: wd.authFailCount, samples: wd.authFailLines?.slice(-5) },
      });
    }
  }

  // ─── Boot persistence audit ───────────────────────────────────────
  if (snapshot.bootPersistence?.targets) {
    const currTargets = snapshot.bootPersistence.targets;
    const prevTargets = previous?.bootPersistence?.targets || {};
    for (const [target, curr] of Object.entries(currTargets)) {
      const prev = prevTargets[target];
      if (!prev) continue; // first run — baseline only
      if (curr.kind === 'file') {
        if (prev.exists && !curr.exists) {
          events.push({
            type: 'BOOT_FILE_REMOVED',
            severity: curr.severity || 'HIGH',
            payload: { target, message: `Boot-persistence file removed: ${target}` },
          });
        } else if (!prev.exists && curr.exists) {
          events.push({
            type: 'BOOT_FILE_CREATED',
            severity: curr.severity || 'HIGH',
            payload: { target, hash: curr.hash, message: `Boot-persistence file created: ${target}. Review contents.` },
          });
        } else if (prev.exists && curr.exists && prev.hash !== curr.hash) {
          events.push({
            type: 'BOOT_FILE_MODIFIED',
            severity: curr.severity || 'HIGH',
            payload: { target, prevHash: prev.hash, newHash: curr.hash, message: `Boot-persistence file modified: ${target}. Diff manually.` },
          });
        }
      } else if (curr.kind === 'dir' && prev.entries && curr.entries) {
        const prevByName = new Map(prev.entries.map(e => [e.name, e]));
        const currByName = new Map(curr.entries.map(e => [e.name, e]));
        for (const [name, e] of currByName) {
          const p = prevByName.get(name);
          if (!p) {
            events.push({
              type: 'BOOT_DIR_NEW_ENTRY',
              severity: curr.severity || 'HIGH',
              payload: { target, name, entry: e, message: `New entry in boot-persistence dir ${target}: ${name}` },
            });
          } else if (p.hash && e.hash && p.hash !== e.hash) {
            events.push({
              type: 'BOOT_DIR_MODIFIED',
              severity: curr.severity || 'HIGH',
              payload: { target, name, prevHash: p.hash, newHash: e.hash, message: `Modified entry in ${target}: ${name}` },
            });
          }
        }
        for (const [name] of prevByName) {
          if (!currByName.has(name)) {
            events.push({
              type: 'BOOT_DIR_REMOVED',
              severity: 'MEDIUM',
              payload: { target, name, message: `Entry removed from ${target}: ${name}` },
            });
          }
        }
      }
    }
  }

  // ─── Clipboard exfiltration ───────────────────────────────────────
  if (snapshot.clipboard?.available) {
    const clip = snapshot.clipboard;
    const prev = previous?.clipboard;
    if (prev?.available && prev.hash && clip.hash && prev.hash !== clip.hash) {
      // Clipboard changed. Was the foreground app stable?
      const frontChanged = prev.frontmost && clip.frontmost && prev.frontmost !== clip.frontmost;
      if (!frontChanged) {
        events.push({
          type: 'CLIPBOARD_CHANGED_IDLE',
          severity: 'MEDIUM',
          payload: { frontmost: clip.frontmost, message: `Clipboard changed with no foreground-app context change. Possible silent exfiltration or injection.` },
        });
      }
    }
  }

  // ─── Camera / microphone activation ───────────────────────────────
  if (snapshot.avDevices?.available) {
    const av = snapshot.avDevices;
    const whitelist = new Set([...(av.defaultWhitelist || []), ...((state.whitelist?.avApps) || [])]);
    const activeCount = (av.camActive?.length || 0) + (av.micActive?.length || 0);
    if (activeCount > 0) {
      const frontmost = av.frontmost || 'unknown';
      const legitimate = whitelist.has(frontmost);
      if (!legitimate) {
        events.push({
          type: 'AV_ACTIVE_UNKNOWN_APP',
          severity: 'CRITICAL',
          payload: {
            frontmost,
            cam: av.camActive?.length || 0,
            mic: av.micActive?.length || 0,
            message: `Camera or microphone is active while frontmost app "${frontmost}" is not on the AV whitelist.`,
          },
        });
      }
    }
  }

  // ─── sudo / privilege escalation ──────────────────────────────────
  if (snapshot.logins?.sudoEvents) {
    const prevSudo = new Set((previous?.logins?.sudoEvents || []).map(e => e.raw));
    for (const ev of snapshot.logins.sudoEvents) {
      if (prevSudo.has(ev.raw)) continue;
      if (ev.kind === 'fail') {
        events.push({
          type: 'SUDO_FAIL',
          severity: 'CRITICAL',
          payload: { user: ev.user, reason: ev.reason, raw: ev.raw, message: `Failed sudo attempt by ${ev.user}: ${ev.reason}` },
        });
      } else if (ev.kind === 'success') {
        events.push({
          type: 'SUDO_RUN',
          severity: 'HIGH',
          payload: { user: ev.user, asUser: ev.asUser, command: ev.command, tty: ev.tty, pwd: ev.pwd, message: `sudo: ${ev.user} → ${ev.asUser} ran ${ev.command}` },
        });
      }
    }
  }

  // ─── Self-integrity / heartbeat (set from sentinel.js) ────────────
  if (snapshot._selfIntegrity && snapshot._selfIntegrity.ok === false) {
    events.push({
      type: 'SELF_INTEGRITY_FAIL',
      severity: 'CRITICAL',
      payload: { ...snapshot._selfIntegrity, message: 'Sentinel self-integrity check failed. The Sentinel source files have been modified since install.' },
    });
  }
  if (snapshot._heartbeat && snapshot._heartbeat.gapMs && snapshot._heartbeat.gapMs > snapshot._heartbeat.expectedMs * 3) {
    events.push({
      type: 'HEARTBEAT_GAP',
      severity: 'HIGH',
      payload: { ...snapshot._heartbeat, message: `Sentinel was not running for ${Math.round(snapshot._heartbeat.gapMs / 1000)}s. It may have been killed.` },
    });
  }

  return events;
}

module.exports = { analyze, shouldEmit, signatureFor, RATE_LIMIT_MS };
