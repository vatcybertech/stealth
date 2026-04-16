#!/usr/bin/env node
// SHIELD Mac Sentinel — main daemon entry point.
//
// Usage:
//   node sentinel.js              Run with existing PIN (prompts on TTY)
//   node sentinel.js --setup      First-run PIN setup
//   node sentinel.js --pair       Print pairing info for the PWA
//   node sentinel.js --self-test  Run collectors once in dry mode
//   node sentinel.js --status     Print last known status and exit
//
// Environment:
//   SHIELD_PIN   set to pre-supply the PIN (LaunchAgent sets this from a
//                macOS keychain item; see install.sh)

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const crypto = require('crypto');

const { deriveKey, randomSalt, encrypt, decrypt, sha256, makeVerifier, canonicalJSON, uuidv4, nowIso } = require('./lib/crypto');
const Ledger = require('./lib/ledger');
const { Server } = require('./lib/server');
const { analyze, shouldEmit } = require('./lib/analyzer');
const { applyRules, DEFAULTS: DEFAULT_RULES } = require('./lib/rules');
const selfIntegrity = require('./lib/self_integrity');
const AutoResponseEngine = require('./lib/auto_response');
const BannerServer = require('./lib/banner_server');
const { LogStream } = require('./lib/log_stream');
const forensic = require('./lib/forensic');
const counterRecon = require('./lib/counter_recon');
const Enforcer = require('./lib/enforcer');
const SelfHeal = require('./lib/self_heal');
const Blocklist = require('./lib/blocklist');
const startupBeacon = require('./lib/startup_beacon');

const collectors = {
  network:           require('./lib/collectors/network'),
  bluetooth:         require('./lib/collectors/bluetooth'),
  profiles:          require('./lib/collectors/profiles'),
  launchAgents:      require('./lib/collectors/launch_agents'),
  loginItems:        require('./lib/collectors/login_items'),
  integrity:         require('./lib/collectors/integrity'),
  processes:         require('./lib/collectors/processes'),
  logins:            require('./lib/collectors/logins'),
  sharing:           require('./lib/collectors/sharing'),
  canaries:          require('./lib/collectors/canaries'),
  usb:               require('./lib/collectors/usb'),
  wifiDeauth:        require('./lib/collectors/wifi_deauth'),
  bootPersistence:   require('./lib/collectors/boot_persistence'),
  clipboard:         require('./lib/collectors/clipboard'),
  avDevices:         require('./lib/collectors/av_devices'),
  egress:            require('./lib/collectors/egress'),
  timeDrift:         require('./lib/collectors/time_drift'),
  honeypots:         require('./lib/collectors/honeypots'),
  shellRc:           require('./lib/collectors/shell_rc'),
  installerReceipts: require('./lib/collectors/installer_receipts'),
  appBundles:        require('./lib/collectors/app_bundles'),
  inputSources:      require('./lib/collectors/input_sources'),
  secureBoot:        require('./lib/collectors/secureboot'),
};

// Time drift runs on its own schedule (default 10 min) — NTP queries
// are slow and rate-limited, so we do NOT call this collector from
// every scan. Each run writes its own events directly to the ledger.
const TIME_DRIFT_INTERVAL_MS = 10 * 60 * 1000;

// ─── Heartbeat ─────────────────────────────────────────────────────────────
function heartbeatPath() { return path.join(CFG.paths.stateDir, 'heartbeat.json'); }
function readHeartbeat() {
  try {
    const raw = fs.readFileSync(heartbeatPath(), 'utf8');
    return JSON.parse(raw);
  } catch { return null; }
}
function writeHeartbeat(extra = {}) {
  const data = { ts: nowIso(), pid: process.pid, ...extra };
  try {
    fs.writeFileSync(heartbeatPath(), JSON.stringify(data), { mode: 0o600 });
  } catch {}
  return data;
}

// ─── Config ────────────────────────────────────────────────────────────────
const CONFIG_PATH = path.join(__dirname, 'config', 'defaults.json');
const rawConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const CFG = expandConfig(rawConfig);

function expandHome(p) { return p.replace(/^~(?=\/|$)/, os.homedir()); }
function expandConfig(cfg) {
  const out = JSON.parse(JSON.stringify(cfg));
  for (const key of Object.keys(out.paths)) {
    out.paths[key] = expandHome(out.paths[key]);
  }
  return out;
}

function ensureDirs() {
  for (const key of ['stateDir', 'certDir']) {
    const p = CFG.paths[key];
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true, mode: 0o700 });
  }
}

// ─── PIN / key management ──────────────────────────────────────────────────
function loadVerifier() {
  if (!fs.existsSync(CFG.paths.verifierFile)) return null;
  return JSON.parse(fs.readFileSync(CFG.paths.verifierFile, 'utf8'));
}
function saveVerifier(verifier) {
  fs.writeFileSync(CFG.paths.verifierFile, JSON.stringify(verifier, null, 2), { mode: 0o600 });
}

function verifyPin(pin) {
  const v = loadVerifier();
  if (!v) return null;
  const candidate = makeVerifier(pin, Buffer.from(v.salt, 'hex'));
  if (candidate === v.verifier) return Buffer.from(v.keySalt, 'hex');
  return null;
}

async function promptPin(label = 'PIN: ') {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    // Disable echo where we can
    const stdin = process.stdin;
    if (stdin.isTTY && stdin.setRawMode) {
      stdin.setRawMode(true);
      process.stdout.write(label);
      let buf = '';
      const onData = (ch) => {
        const s = ch.toString('utf8');
        if (s === '\r' || s === '\n') {
          stdin.setRawMode(false);
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          resolve(buf);
          return;
        }
        if (s === '\u0003') { process.exit(1); } // Ctrl-C
        if (s === '\u007f' || s === '\b') { buf = buf.slice(0, -1); return; }
        buf += s;
      };
      stdin.on('data', onData);
    } else {
      rl.question(label, (answer) => { rl.close(); resolve(answer); });
    }
  });
}

async function setupPin() {
  console.log('SHIELD Mac Sentinel — First-run PIN setup');
  console.log('Choose a 6+ digit PIN. You will use this PIN on every device where you run the PWA.');
  const a = await promptPin('New PIN: ');
  if (a.length < 6) { console.error('PIN too short. Exiting.'); process.exit(1); }
  const b = await promptPin('Confirm:  ');
  if (a !== b) { console.error('PINs do not match. Exiting.'); process.exit(1); }
  const verifierSalt = randomSalt();
  const keySalt      = randomSalt();
  const manifestSalt = randomSalt();
  const verifier     = makeVerifier(a, verifierSalt);
  saveVerifier({
    salt: verifierSalt.toString('hex'),
    keySalt: keySalt.toString('hex'),
    manifestSalt: manifestSalt.toString('hex'),
    verifier,
    createdAt: nowIso(),
  });

  // Write the signed self-integrity manifest at install time.
  ensureDirs();
  const sentinelRoot = __dirname;
  const manifest = selfIntegrity.buildManifest(sentinelRoot);
  const manifestKey = selfIntegrity.deriveManifestKey(a, manifestSalt);
  const signed = selfIntegrity.signManifest(manifest, manifestKey);
  const manifestPath = path.join(CFG.paths.stateDir, 'selfintegrity.json');
  selfIntegrity.writeManifest(manifestPath, signed);
  console.log(`Self-integrity manifest written: ${manifestPath}`);

  console.log('PIN saved. You can now start the Sentinel normally.');
  console.log('');
  console.log('Pairing information for the PWA:');
  const key = deriveKey(a, keySalt);
  const ledger = new Ledger(CFG.paths.ledgerFile, key);
  ledger.verify();
  ledger.append('APP_OPEN', 'INFO', { stage: 'setup', hostname: os.hostname() });
  // Ensure canaries exist from the very beginning so their baseline is set.
  try { collectors.canaries.ensureCanariesExist(); } catch {}
  const serverCtx = buildServerCtx({ key, ledger, verifier, verifierSalt, keySalt });
  const server = new Server(serverCtx);
  console.log(`  Host:        ${CFG.server.host}`);
  console.log(`  Port:        ${CFG.server.port}`);
  console.log(`  Cert SHA256: ${server.certFingerprint}`);
  console.log('');
  console.log('Copy the cert fingerprint into the PWA Settings → Mac Sentinel to pin it.');
  process.exit(0);
}

// ─── State persistence ────────────────────────────────────────────────────
function loadState(key) {
  if (!fs.existsSync(CFG.paths.stateFile)) return { whitelist: { network: [], bluetooth: [] }, rules: [...DEFAULT_RULES], snapshots: [] };
  try {
    const blob = fs.readFileSync(CFG.paths.stateFile);
    const plain = decrypt(key, blob);
    return JSON.parse(plain);
  } catch (err) {
    console.error('state decrypt failed — starting fresh:', err.message);
    return { whitelist: { network: [], bluetooth: [] }, rules: [...DEFAULT_RULES], snapshots: [] };
  }
}
function saveState(key, state) {
  const blob = encrypt(key, JSON.stringify(state));
  fs.writeFileSync(CFG.paths.stateFile, blob, { mode: 0o600 });
}

// ─── Collector orchestration ──────────────────────────────────────────────
async function runCollectors() {
  const canaryUrl = (CFG.honeypots && CFG.honeypots.canaryUrl) || undefined;
  const [
    network, bluetooth, profiles, launchAgents, loginItems,
    integrity, processes, logins, sharing, canaries, usb,
    wifiDeauth, bootPersistence, clipboard, avDevices, egress,
    honeypots, shellRc, installerReceipts,
    appBundles, inputSources, secureBoot,
  ] = await Promise.all([
    collectors.network.collect(),
    collectors.bluetooth.collect(),
    collectors.profiles.collect(),
    collectors.launchAgents.collect(),
    collectors.loginItems.collect(),
    collectors.integrity.collect(),
    collectors.processes.collect(),
    collectors.logins.collect(),
    collectors.sharing.collect(),
    collectors.canaries.collect(),
    collectors.usb.collect(),
    collectors.wifiDeauth.collect(),
    collectors.bootPersistence.collect(),
    collectors.clipboard.collect(),
    collectors.avDevices.collect(),
    collectors.egress.collect(),
    collectors.honeypots.collect(canaryUrl),
    collectors.shellRc.collect(),
    collectors.installerReceipts.collect(),
    collectors.appBundles.collect(),
    collectors.inputSources.collect(),
    collectors.secureBoot.collect(),
  ]);
  return {
    network, bluetooth, profiles, launchAgents, loginItems,
    integrity, processes, logins, sharing, canaries, usb,
    wifiDeauth, bootPersistence, clipboard, avDevices, egress,
    honeypots, shellRc, installerReceipts,
    appBundles, inputSources, secureBoot,
  };
}

// ─── Scan loop ────────────────────────────────────────────────────────────
function makeRunner({ key, ledger, state, selfIntegrityResult, autoResponse, pwaAnchorRef, enforcer, blocklist }) {
  let previous = state.snapshots[state.snapshots.length - 1] || null;
  let lastStatus = null;
  let latestEvents = [];
  let scanRunning = false;
  let aggressiveUntil = 0;
  let intervalHandle = null;
  const rateLimiter = new Map(); // signature → lastEmittedTs

  async function tick() {
    if (scanRunning) return;
    scanRunning = true;
    try {
      // Read and update heartbeat. If there's a gap, inject a synthetic
      // _heartbeat sub-object into the snapshot so the analyzer can raise
      // a HEARTBEAT_GAP event.
      const prevHb = readHeartbeat();
      const expectedMs = (Date.now() < aggressiveUntil ? CFG.aggressiveIntervalMs : CFG.scanIntervalMs);
      const now = Date.now();
      const gapMs = prevHb ? now - new Date(prevHb.ts).getTime() : 0;
      writeHeartbeat({ interval: expectedMs });

      const snapshot = await runCollectors();
      // Attach meta from this runner's perspective for the analyzer.
      snapshot._heartbeat = { gapMs, expectedMs, prev: prevHb };
      snapshot._selfIntegrity = selfIntegrityResult || { ok: true };

      const raw = analyze(snapshot, previous, state);
      // Rate-limit dedup before rules (CRITICAL always passes).
      const deduped = raw.filter(e => shouldEmit(e, rateLimiter));
      const events = applyRules(deduped, state.rules || DEFAULT_RULES, new Date());

      // Persist to ledger — attach the current PWA anchor to each
      // entry if one was provided by the last /journal POST. This is
      // the outbound half of bidirectional ledger cross-sealing.
      const currentPwaAnchor = pwaAnchorRef && pwaAnchorRef.value ? pwaAnchorRef.value : null;
      for (const e of events) ledger.append(e.type, e.severity, e.payload, { pwaAnchor: currentPwaAnchor });
      latestEvents = events;
      lastStatus = buildStatus(snapshot, events);

      // Aggressive-mode auto-trigger: any HIGH or CRITICAL event flips
      // the Sentinel into fast-polling for 10 minutes so we catch the
      // next stage quickly.
      const topRank = events.reduce((acc, e) => Math.max(acc, { INFO:0, LOW:1, MEDIUM:2, HIGH:3, CRITICAL:4 }[e.severity] || 0), 0);
      if (topRank >= 3 && Date.now() >= aggressiveUntil) {
        aggressiveUntil = Date.now() + 10 * 60 * 1000;
        ledger.append('AGGRESSIVE_ON', 'INFO', { reason: 'auto-trigger on HIGH/CRITICAL', until: new Date(aggressiveUntil).toISOString() });
      }

      // Auto-response engine: fire for any CRITICAL event if the Mac
      // is screen-locked and auto-response is enabled in config.
      if (autoResponse) {
        const criticals = events.filter(e => e.severity === 'CRITICAL');
        for (const critical of criticals) {
          try {
            await autoResponse.fire(critical);
          } catch (err) {
            ledger.append('AUTO_RESPONSE_ERROR', 'HIGH', { error: err.message });
          }
          break; // fire once per tick max
        }
      }

      // Enforcement engine: take corrective action on every event
      // that maps to a known enforcement handler. Runs regardless of
      // severity — the engine has its own dispatch logic and its
      // own grace-period gating.
      if (enforcer) {
        for (const ev of events) {
          try {
            await enforcer.handleEvent(ev, snapshot);
          } catch (err) {
            ledger.append('ENFORCEMENT_ERROR', 'HIGH', { event: ev.type, error: err.message });
          }
        }
      }

      // iPhone cross-infection watch: any IPHONE_CONNECTED event starts
      // a 60-second watch timer. After the window, we re-run the
      // persistence-adjacent collectors and diff against the snapshot
      // captured at the moment of the USB connection. Any drift = a
      // possible cross-device payload delivery.
      for (const ev of events) {
        if (ev.type !== 'IPHONE_CONNECTED') continue;
        const baselineSnapshot = {
          launchAgents: snapshot.launchAgents,
          profiles: snapshot.profiles,
          loginItems: snapshot.loginItems,
          bootPersistence: snapshot.bootPersistence,
        };
        runner.goAggressive(10 * 60 * 1000);
        setTimeout(async () => {
          try {
            const [la2, pr2, li2, bp2] = await Promise.all([
              collectors.launchAgents.collect(),
              collectors.profiles.collect(),
              collectors.loginItems.collect(),
              collectors.bootPersistence.collect(),
            ]);
            // Cheap canonical-JSON comparison to flag any drift.
            const before = canonicalJSON(baselineSnapshot);
            const after = canonicalJSON({ launchAgents: la2, profiles: pr2, loginItems: li2, bootPersistence: bp2 });
            if (before !== after) {
              ledger.append('IPHONE_CROSS_INFECTION_SUSPECTED', 'CRITICAL', {
                device: ev.payload.device,
                window: '60s after USB connection',
                drift: {
                  launchAgentsChanged: canonicalJSON(baselineSnapshot.launchAgents) !== canonicalJSON(la2),
                  profilesChanged: canonicalJSON(baselineSnapshot.profiles) !== canonicalJSON(pr2),
                  loginItemsChanged: canonicalJSON(baselineSnapshot.loginItems) !== canonicalJSON(li2),
                  bootPersistenceChanged: canonicalJSON(baselineSnapshot.bootPersistence) !== canonicalJSON(bp2),
                },
                message: 'Persistence surface changed within 60 seconds of an iPhone USB connection. Possible cross-device payload delivery. Review the launch_agents / profiles / login_items / boot_persistence events written around this timestamp.',
              });
            } else {
              ledger.append('IPHONE_CROSS_INFECTION_CLEAN', 'INFO', { device: ev.payload.device, window: '60s' });
            }
          } catch (err) {
            ledger.append('IPHONE_CROSS_INFECTION_ERROR', 'LOW', { error: err.message });
          }
        }, 60_000);
        break; // only one watch per tick
      }

      // Counter-reconnaissance: for each new LAN device detected in this
      // tick, run a TCP connect probe on remote-access ports. Any
      // remote-access port open on the unknown device escalates the
      // event severity retroactively via a follow-up COUNTER_RECON event.
      for (const ev of events) {
        if (ev.type !== 'DEVICE_NEW' || ev.payload?.scope !== 'network') continue;
        const ip = ev.payload?.device?.ip;
        if (!ip) continue;
        // Fire and forget — probing takes up to ~10s total.
        (async () => {
          try {
            const result = await counterRecon.probeDevice(ip);
            const severity = result.remoteAccessOpen && result.remoteAccessOpen.length > 0 ? 'HIGH' : 'INFO';
            ledger.append('COUNTER_RECON_RESULT', severity, {
              result,
              message: severity === 'HIGH'
                ? `Unknown LAN device at ${ip} has remote-access ports open (${result.remoteAccessOpen.join(', ')}). This is what an attacker control machine looks like.`
                : `Probed unknown LAN device at ${ip}. Open ports: ${(result.openPorts || []).join(', ') || 'none'}.`,
            });
            // If the probed device has remote-access ports open AND
            // blocklist is enabled, block it at the pf firewall layer
            // so that no traffic to or from it traverses this Mac.
            if (severity === 'HIGH' && blocklist) {
              try {
                await blocklist.add(ip, 'remote-access-ports-open', { openPorts: result.openPorts });
              } catch (err) {
                ledger.append('BLOCKLIST_ADD_ERROR', 'HIGH', { ip, error: err.message });
              }
            }
          } catch (err) {
            ledger.append('COUNTER_RECON_ERROR', 'LOW', { ip, error: err.message });
          }
        })();
      }

      previous = snapshot;
      state.snapshots = [...(state.snapshots || []).slice(-4), snapshot];
      saveState(key, state);
    } catch (err) {
      console.error('[scan] error:', err.message);
      try { ledger.append('SCAN_ERROR', 'LOW', { message: err.message }); } catch {}
    } finally {
      scanRunning = false;
    }
  }

  function schedule() {
    const mode = Date.now() < aggressiveUntil ? 'aggressive' : 'normal';
    const base = mode === 'aggressive' ? CFG.aggressiveIntervalMs : CFG.scanIntervalMs;
    // Add ±20% jitter so a LAN observer cannot fingerprint SHIELD by the
    // exact packet-timing cadence of its internal polling.
    const jitter = Math.floor((Math.random() - 0.5) * 0.4 * base);
    const interval = Math.max(1000, base + jitter);
    if (intervalHandle) clearTimeout(intervalHandle);
    intervalHandle = setTimeout(async () => { await tick(); schedule(); }, interval);
  }

  function start() { tick().then(schedule); }
  function goAggressive(ms = 10 * 60 * 1000) { aggressiveUntil = Date.now() + ms; }
  function getStatus() { return lastStatus || { ready: false }; }
  function getEvents() { return latestEvents; }

  return { start, goAggressive, getStatus, getEvents };
}

function buildStatus(snapshot, events) {
  const severityRank = { INFO: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
  const top = events.reduce((acc, e) => (severityRank[e.severity] > severityRank[acc] ? e.severity : acc), 'INFO');
  return {
    ready: true,
    ts: nowIso(),
    topSeverity: top,
    summary: {
      ssid: snapshot.network?.wifi?.ssid || null,
      gateway: snapshot.network?.gateway || null,
      dns: snapshot.network?.dnsServers || [],
      arpCount: snapshot.network?.arp?.length || 0,
      listenerCount: snapshot.network?.listenerCount || 0,
      btEnabled: snapshot.bluetooth?.enabled ?? null,
      btDevices: snapshot.bluetooth?.deviceCount ?? 0,
      processCount: snapshot.processes?.processCount || 0,
      unsignedCount: snapshot.processes?.unsignedCount || 0,
      lockdownMode: !!snapshot.integrity?.lockdownMode?.enabled,
      fileVault: !!snapshot.integrity?.fileVault?.enabled,
      sip: !!snapshot.integrity?.sip?.enabled,
      gatekeeper: !!snapshot.integrity?.gatekeeper?.enabled,
      firewall: !!snapshot.integrity?.firewall?.enabled,
      profileCount: snapshot.profiles?.allProfileCount || 0,
      launchAgentCount: snapshot.launchAgents?.totalUserInstalled || 0,
      sharingActive: snapshot.sharing?.activeCount || 0,
    },
    recentEvents: events.slice(-25),
    snapshot, // full detail for the dashboard
  };
}

// ─── Server context ───────────────────────────────────────────────────────
function buildServerCtx({ key, ledger, verifierSalt, verifierHex, keySalt, runner, state, autoResponse, pwaAnchorRef }) {
  const v = loadVerifier();
  const certDir = CFG.paths.certDir;
  return {
    port: CFG.server.port,
    host: CFG.server.host,
    certDir,
    allowedOrigins: CFG.server.allowedOrigins,
    verify: (pin) => {
      const candidate = makeVerifier(pin, Buffer.from(v.salt, 'hex'));
      return candidate === v.verifier;
    },
    getStatus: () => (runner ? runner.getStatus() : { ready: false }),
    getLedgerLastHash: () => ledger.lastHash,
    getAutoResponseState: () => (autoResponse ? { pending: autoResponse.isPending, state: autoResponse.state } : null),
    acknowledgeAutoResponse: async () => {
      if (!autoResponse) return { acknowledged: false, reason: 'disabled' };
      return autoResponse.acknowledge();
    },
    getAlerts: (since) => ledger.readSince(since).filter(e => e.severity !== 'INFO'),
    getLedger: (since) => ledger.readSince(since),
    getExport: () => ({
      generatedAt: nowIso(),
      hostname: os.hostname(),
      ledgerCount: ledger.count,
      ledgerLastHash: ledger.lastHash,
      ledgerTampered: ledger.tampered,
      entries: ledger.readAll(),
      whitelist: state?.whitelist || {},
      rules: state?.rules || [],
    }),
    modifyWhitelist: (change) => {
      if (!state) return null;
      if (change.type === 'add' && change.scope && change.device) {
        state.whitelist[change.scope] = [...(state.whitelist[change.scope] || []), change.device];
      } else if (change.type === 'remove' && change.scope && change.fingerprint) {
        state.whitelist[change.scope] = (state.whitelist[change.scope] || []).filter(d => d.fingerprint !== change.fingerprint && d.mac !== change.fingerprint && d.address !== change.fingerprint);
      }
      saveState(key, state);
      ledger.append('WHITELIST_CHANGE', 'INFO', { change });
      return state.whitelist;
    },
    recordJournal: (entry) => {
      // Bidirectional cross-sealing inbound half: PWA sends its latest
      // journal entry hash. We remember it so the NEXT Sentinel ledger
      // entry can embed it in `pwaAnchor`.
      if (entry && typeof entry.hash === 'string' && /^[0-9a-f]{64}$/.test(entry.hash)) {
        if (pwaAnchorRef) pwaAnchorRef.value = entry.hash;
      }
      const written = ledger.append('JOURNAL_ENTRY', entry.severity || 'INFO', { ...entry, source: 'pwa' }, { pwaAnchor: entry?.hash || null });
      return written.id;
    },
    recordKillSwitch: (context) => {
      const written = ledger.append('KILL_SWITCH', 'CRITICAL', context || {});
      if (runner) runner.goAggressive();
      return written.id;
    },
  };
}

// ─── Modes ────────────────────────────────────────────────────────────────
async function modeForensic() {
  // First-run forensic sweep. Runs BEFORE --setup. Assumes the Mac
  // may already be compromised and prints a human-readable summary
  // with color coding. If a verifier exists (SHIELD is already set
  // up), we also write the findings to the ledger as a single
  // INITIAL_FORENSIC_SWEEP entry. Otherwise we just print.
  const result = await forensic.runSweep();
  const v = loadVerifier();
  if (v) {
    const pin = process.env.SHIELD_PIN || await promptPin('PIN (to write findings to ledger): ');
    const candidate = makeVerifier(pin, Buffer.from(v.salt, 'hex'));
    if (candidate === v.verifier) {
      const key = deriveKey(pin, Buffer.from(v.keySalt, 'hex'));
      ensureDirs();
      const ledger = new Ledger(CFG.paths.ledgerFile, key);
      ledger.verify();
      const severity = result.criticals > 0 ? 'CRITICAL' : result.highs > 0 ? 'HIGH' : 'INFO';
      ledger.append('INITIAL_FORENSIC_SWEEP', severity, result);
      console.log(`\nFindings written to ledger as INITIAL_FORENSIC_SWEEP (${severity}).`);
    } else {
      console.log('\nWrong PIN — findings NOT written to ledger. Console output above is the only record of this sweep.');
    }
  } else {
    console.log('\nSHIELD not yet set up (no verifier found). This sweep is for triage only.');
    console.log('After reviewing the findings above, run: node sentinel.js --setup');
  }
  process.exit(result.criticals > 0 ? 2 : 0);
}

async function modeSelfTest() {
  console.log('SHIELD self-test — running collectors once, no ledger writes…');
  const started = Date.now();
  const snapshot = await runCollectors();
  console.log(`Collectors OK in ${Date.now() - started}ms.`);
  console.log('Summary:');
  console.log(JSON.stringify({
    wifi: snapshot.network.wifi,
    gateway: snapshot.network.gateway,
    dns: snapshot.network.dnsServers,
    arpDeviceCount: snapshot.network.arp.length,
    listenerCount: snapshot.network.listenerCount,
    btAvailable: snapshot.bluetooth.available,
    btDevices: snapshot.bluetooth.deviceCount,
    profiles: snapshot.profiles.allProfileCount,
    launchAgents: snapshot.launchAgents.totalUserInstalled,
    loginItems: snapshot.loginItems.classicCount,
    integrity: {
      lockdown: snapshot.integrity.lockdownMode.enabled,
      fileVault: snapshot.integrity.fileVault.enabled,
      sip: snapshot.integrity.sip.enabled,
      gatekeeper: snapshot.integrity.gatekeeper.enabled,
      firewall: snapshot.integrity.firewall.enabled,
    },
    unsignedProcesses: snapshot.processes.unsignedCount,
    sharingActive: snapshot.sharing.activeCount,
  }, null, 2));
  process.exit(0);
}

async function modePair() {
  const v = loadVerifier();
  if (!v) { console.error('No verifier — run `node sentinel.js --setup` first.'); process.exit(1); }
  const pin = process.env.SHIELD_PIN || await promptPin('PIN: ');
  const keySalt = Buffer.from(v.keySalt, 'hex');
  const candidate = makeVerifier(pin, Buffer.from(v.salt, 'hex'));
  if (candidate !== v.verifier) { console.error('Wrong PIN.'); process.exit(1); }
  const key = deriveKey(pin, keySalt);
  const ledger = new Ledger(CFG.paths.ledgerFile, key);
  ledger.verify();
  const state = loadState(key);
  const ctx = buildServerCtx({ key, ledger, keySalt, state });
  const server = new Server(ctx);
  console.log('Pairing info:');
  console.log(`  Host:        ${CFG.server.host}`);
  console.log(`  Port:        ${CFG.server.port}`);
  console.log(`  Cert SHA256: ${server.certFingerprint}`);
  process.exit(0);
}

async function modeRun() {
  const v = loadVerifier();
  if (!v) { console.error('No verifier — run `node sentinel.js --setup` first.'); process.exit(1); }
  const pin = process.env.SHIELD_PIN || await promptPin('PIN: ');
  const keySalt = Buffer.from(v.keySalt, 'hex');
  const candidate = makeVerifier(pin, Buffer.from(v.salt, 'hex'));
  if (candidate !== v.verifier) { console.error('Wrong PIN.'); process.exit(1); }
  const key = deriveKey(pin, keySalt);
  ensureDirs();

  // ─── Self-integrity check (before we trust anything else) ──────────
  let selfIntegrityResult = { ok: true, reason: 'no_manifest' };
  if (v.manifestSalt) {
    const manifestKey = selfIntegrity.deriveManifestKey(pin, Buffer.from(v.manifestSalt, 'hex'));
    const manifestPath = path.join(CFG.paths.stateDir, 'selfintegrity.json');
    selfIntegrityResult = selfIntegrity.verifyManifest(manifestPath, __dirname, manifestKey);
    if (!selfIntegrityResult.ok) {
      console.error('SHIELD SELF-INTEGRITY FAIL:', selfIntegrityResult);
      console.error('Sentinel source files have been modified since install.');
      console.error('This is logged as CRITICAL and the Sentinel refuses to run.');
      // We still write to the ledger so there is a record of the attempt.
      try {
        const ledger = new Ledger(CFG.paths.ledgerFile, key);
        ledger.verify();
        ledger.append('SELF_INTEGRITY_FAIL', 'CRITICAL', selfIntegrityResult);
      } catch {}
      process.exit(2);
    }
  } else {
    console.warn('No manifestSalt in verifier — running without self-integrity check.');
    console.warn('Re-run `node sentinel.js --setup` to enable it.');
  }

  const ledger = new Ledger(CFG.paths.ledgerFile, key);
  const v2 = ledger.verify();
  if (!v2.ok) {
    ledger.append('LEDGER_TAMPER', 'CRITICAL', v2);
    console.error('LEDGER TAMPER DETECTED — continuing but flag logged.');
  }
  ledger.append('APP_OPEN', 'INFO', { stage: 'run', hostname: os.hostname(), pid: process.pid, selfIntegrity: selfIntegrityResult });
  const state = loadState(key);
  // Make sure canaries exist (no-op if they already do).
  try { collectors.canaries.ensureCanariesExist(); } catch {}

  // ─── Startup beacon (unexpected-reboot detection) ─────────────────
  try {
    await startupBeacon.record({
      append: (type, sev, payload) => ledger.append(type, sev, payload),
      stateFile: CFG.paths.startupBeaconFile,
      heartbeatFile: heartbeatPath(),
    });
  } catch (err) {
    ledger.append('STARTUP_BEACON_ERROR', 'LOW', { error: err.message });
  }

  // ─── Enforcement engine (v2.2) ────────────────────────────────────
  // Active enforcement — executes real actions on real events once the
  // 72-hour grace period has elapsed. See docs/ENFORCEMENT.md.
  const enforcer = new Enforcer({
    config: CFG.enforcement || {},
    append: (type, sev, payload) => ledger.append(type, sev, payload, { pwaAnchor: pwaAnchorRef.value }),
    installedAt: (v.createdAt ? Date.parse(v.createdAt) : Date.now()),
    stateDir: CFG.paths.stateDir,
  });
  // Seed baselines (etc-hosts, shell RCs) if they don't exist yet.
  enforcer.seedBaselines();

  // ─── Blocklist (pf firewall integration) ──────────────────────────
  const blocklist = new Blocklist({
    config: CFG.blocklist || {},
    append: (type, sev, payload) => ledger.append(type, sev, payload),
    stateFile: CFG.paths.blocklistFile,
  });
  await blocklist.start();

  // ─── Auto-response engine ─────────────────────────────────────────
  // Reads screen lock state, kills Wi-Fi, plays audible alarm, shows
  // alert dialog on CRITICAL events while the Mac is locked. 72-hour
  // grace period after install so first-run false positives don't
  // disrupt the user.
  const autoResponse = new AutoResponseEngine({
    config: CFG.autoResponse || {},
    stateFile: CFG.paths.autoResponseFile,
    append: (type, sev, payload) => ledger.append(type, sev, payload),
    installedAt: (v.createdAt ? Date.parse(v.createdAt) : Date.now()),
  });

  // Mutable anchor reference for bidirectional cross-sealing. The
  // most recent PWA journal entry hash is stored here and embedded
  // in every Sentinel ledger entry written during the main scan loop.
  const pwaAnchorRef = { value: null };

  const runner = makeRunner({ key, ledger, state, selfIntegrityResult, autoResponse, pwaAnchorRef, enforcer, blocklist });
  const ctx = buildServerCtx({ key, ledger, keySalt, runner, state, autoResponse, pwaAnchorRef });
  const server = new Server(ctx);
  await server.start();
  runner.start();
  console.log(`SHIELD Sentinel listening on https://${CFG.server.host}:${CFG.server.port}`);
  console.log(`Cert fingerprint: ${server.certFingerprint}`);

  // ─── Banner server (deterrent notice on port 80) ──────────────────
  // Disabled by default; requires root to bind port 80. Documented in
  // docs/DEPLOY.md under "Advanced: deterrent banner."
  const bannerServer = new BannerServer({
    config: CFG.bannerServer || {},
    append: (type, sev, payload) => ledger.append(type, sev, payload),
    observedSince: v.createdAt || nowIso(),
  });
  await bannerServer.start();

  // ─── Real-time log stream subscriber ──────────────────────────────
  // Single persistent `log stream --predicate` subprocess fanning
  // parsed events (wifi deauth, camera/mic activation, sudo,
  // remote session) into the ledger. Replaces the 30-second polling
  // latency of the individual collectors with sub-second real time.
  const logStream = new LogStream({
    config: CFG.logStream || {},
    onEvent: (event) => {
      try {
        ledger.append(event.type, event.severity, { ...event.payload, source: 'log-stream' }, { pwaAnchor: pwaAnchorRef.value });
        // Any HIGH/CRITICAL log-stream event should also fire the
        // auto-response engine and flip aggressive mode.
        if (event.severity === 'CRITICAL' || event.severity === 'HIGH') {
          runner.goAggressive();
        }
        if (event.severity === 'CRITICAL') {
          autoResponse.fire({ id: null, type: event.type, severity: 'CRITICAL', payload: event.payload }).catch(() => {});
        }
      } catch (err) {
        try { ledger.append('LOG_STREAM_ERROR', 'LOW', { message: err.message }); } catch {}
      }
    },
    onError: (err) => { try { ledger.append('LOG_STREAM_ERROR', 'LOW', { message: err.message }); } catch {} },
  });
  logStream.start();

  // ─── Time drift timer (separate from main scan loop) ──────────────
  const runTimeDrift = async () => {
    try {
      const td = await collectors.timeDrift.collect();
      if (!td.available) {
        // NTP unreachable — network issue or sntp unavailable; LOW noise
        ledger.append('TIME_DRIFT_UNAVAILABLE', 'LOW', { error: td.error || 'unknown' });
        return;
      }
      if (td.drifted) {
        ledger.append('CLOCK_DRIFT', 'CRITICAL', {
          offsetSec: td.offsetSec,
          absOffsetSec: td.absOffsetSec,
          threshold: td.driftThresholdSec,
          server: td.server,
          message: `System clock is off by ${td.absOffsetSec.toFixed(2)}s from ${td.server}. An attacker who shifts your clock corrupts every timestamp in your evidence ledger.`,
        });
      }
      if (td.timed && td.timed.running === false) {
        ledger.append('TIMED_KILLED', 'CRITICAL', {
          error: td.timed.error,
          message: "Apple's time daemon (com.apple.timed) is not running. Without it, automatic clock sync stops. This is a classic anti-forensics move.",
        });
      }
    } catch (err) {
      try { ledger.append('TIME_DRIFT_ERROR', 'LOW', { message: err.message }); } catch {}
    }
  };
  // Run once shortly after startup, then every 10 minutes.
  setTimeout(runTimeDrift, 15_000);
  setInterval(runTimeDrift, TIME_DRIFT_INTERVAL_MS);

  // ─── Self-heal module (v2.2) ───────────────────────────────────────
  // Runs independently on its own 5-minute timer. Verifies the
  // declared hardening baseline and attempts to restore drift on
  // items that can be restored programmatically.
  const selfHeal = new SelfHeal({
    append: (type, sev, payload) => ledger.append(type, sev, payload, { pwaAnchor: pwaAnchorRef.value }),
    integrityCollector: collectors.integrity,
    sharingCollector: collectors.sharing,
    fireAutoResponse: async (ev) => autoResponse.fire(ev).catch(() => {}),
    config: CFG.selfHeal || {},
  });
  selfHeal.start();

  // Graceful shutdown
  const shutdown = (sig) => async () => {
    ledger.append('APP_LOCK', 'INFO', { signal: sig });
    try { selfHeal.stop(); } catch {}
    try { logStream.stop(); } catch {}
    try { await bannerServer.stop(); } catch {}
    await server.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown('SIGINT'));
  process.on('SIGTERM', shutdown('SIGTERM'));
}

// ─── Entry ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.includes('--self-test')) modeSelfTest();
else if (args.includes('--setup')) setupPin();
else if (args.includes('--pair')) modePair();
else if (args.includes('--forensic')) modeForensic();
else modeRun();
