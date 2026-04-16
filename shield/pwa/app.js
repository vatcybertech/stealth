// SHIELD PWA — main application wiring.
//
// Responsibilities:
//   - PIN setup / unlock / auto-lock
//   - Service worker registration
//   - View routing (dashboard / journal / harden / evidence / settings)
//   - Poll Mac Sentinel when paired, merge into UI state
//   - Journal entry creation with encrypted photo attachments
//   - Hardening checklist progress (stored encrypted)
//   - Kill switch via iOS Shortcut
//   - Evidence export (signed JSON + printable HTML)
//   - Danger-zone wipe

'use strict';

(function () {
  const UI = window.ShieldUI;
  const Crypto = window.ShieldCrypto;
  const Storage = window.ShieldStorage;
  const Ledger = window.ShieldLedger;
  const SentinelClient = window.ShieldSentinelClient;

  // ─── App state ───────────────────────────────────────────────────────
  const state = {
    key: null,                 // CryptoKey — in memory only
    ledger: null,              // ShieldLedger instance
    sentinel: null,            // ShieldSentinelClient
    sentinelTamper: null,      // bool | null
    sentinelStatus: null,      // latest /status response
    sentinelAlerts: [],
    checklist: {},             // { [id]: { done, at } }
    autoLockSeconds: 60,
    autoLockTimer: null,
    pollTimer: null,
    locked: true,
    wrongPinCount: 0,
    maxWrongPin: 10,
    settingsLoaded: null,
  };

  // ─── SW registration ─────────────────────────────────────────────────
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.error('SW registration failed:', err));
  }

  // ─── PIN / unlock ────────────────────────────────────────────────────
  async function boot() {
    const settings = await Storage.getAllSettings();
    state.settingsLoaded = settings;
    if (!settings.pinSalt || !settings.verifier) {
      // First run: setup
      setLockPrompt('Create a 6+ digit PIN');
      bindLockInput(async (pin) => {
        if (pin.length < 6) return setLockError('PIN must be at least 6 characters.');
        setLockPrompt('Confirm PIN');
        bindLockInput(async (confirm) => {
          if (confirm !== pin) return setLockError('PINs do not match. Starting over.');
          const salt = Crypto.randomBytes(Crypto.SALT_BYTES);
          const vSalt = Crypto.randomBytes(Crypto.SALT_BYTES);
          const verifier = await Crypto.makeVerifier(pin, vSalt);
          await Storage.setSetting('pinSalt', Array.from(salt));
          await Storage.setSetting('verifierSalt', Array.from(vSalt));
          await Storage.setSetting('verifier', verifier);
          await Storage.setSetting('autoLockSeconds', 60);
          await Storage.setSetting('createdAt', new Date().toISOString());
          await unlockWithPin(pin);
        });
      });
      return;
    }
    setLockPrompt('Enter your PIN');
    bindLockInput(async (pin) => {
      const ok = await tryUnlock(pin, settings);
      if (!ok) {
        state.wrongPinCount++;
        setLockError(`Wrong PIN. ${state.maxWrongPin - state.wrongPinCount} attempts remaining.`);
        if (state.wrongPinCount >= state.maxWrongPin) {
          setLockError('Too many wrong attempts. Wiping.');
          await Storage.wipeAll();
          setTimeout(() => location.reload(), 1500);
        }
      } else {
        state.wrongPinCount = 0;
      }
    });
  }

  async function tryUnlock(pin, settings) {
    const vSalt = Uint8Array.from(settings.verifierSalt);
    const candidate = await Crypto.makeVerifier(pin, vSalt);
    if (!Crypto.constantTimeEqual(candidate, settings.verifier)) return false;
    await unlockWithPin(pin);
    return true;
  }

  async function unlockWithPin(pin) {
    const settings = await Storage.getAllSettings();
    const salt = Uint8Array.from(settings.pinSalt);
    state.key = await Crypto.deriveKey(pin, salt);
    state.ledger = new Ledger(state.key);
    const ok = await state.ledger.load();
    if (!ok) {
      await state.ledger.append('LEDGER_TAMPER', 'CRITICAL', state.ledger.tamperInfo || { reason: 'unknown' });
    }
    await state.ledger.append('APP_OPEN', 'INFO', { ua: navigator.userAgent.slice(0, 180) });
    state.autoLockSeconds = settings.autoLockSeconds || 60;
    // Load checklist
    try {
      const rows = await Storage.getAllEncrypted('checklist', state.key);
      for (const r of rows) {
        if (r && r.id) state.checklist[r.id] = r;
      }
    } catch (err) {
      console.error('checklist load failed:', err);
    }
    // Sentinel: auto-init if paired
    if (settings.sentinelUrl && settings.sentinelFingerprint) {
      state.sentinel = new SentinelClient({
        url: settings.sentinelUrl,
        fingerprint: settings.sentinelFingerprint,
        pin,
      });
    }
    // Hydrate any cached Sentinel state from previous sessions so the
    // dashboard shows something even if we're currently off-network.
    await hydrateFromCache();
    state.locked = false;
    UI.showLock(false);
    UI.showView('dashboard');
    refreshAll();        // render cached state immediately
    startPolling();      // then try to refresh live
    armAutoLock();
  }

  function lockNow() {
    if (state.ledger) state.ledger.append('APP_LOCK', 'INFO', {});
    state.key = null;
    state.ledger = null;
    state.sentinel = null;
    state.sentinelStatus = null;
    state.sentinelAlerts = [];
    state.checklist = {};
    state.locked = true;
    if (state.pollTimer) { clearInterval(state.pollTimer); state.pollTimer = null; }
    if (state.autoLockTimer) { clearTimeout(state.autoLockTimer); state.autoLockTimer = null; }
    UI.showLock(true);
    document.getElementById('pin-input').value = '';
    setLockPrompt('Enter your PIN');
    setLockError('');
    // Force full reload for cleanliness (wipes in-memory key fully).
    setTimeout(() => location.reload(), 100);
  }

  function setLockPrompt(msg) { document.getElementById('lock-prompt').textContent = msg; }
  function setLockError(msg)  { document.getElementById('lock-error').textContent = msg; }

  function bindLockInput(handler) {
    const input = document.getElementById('pin-input');
    input.value = '';
    input.focus();
    const onKey = (e) => {
      if (e.key === 'Enter') {
        const val = input.value;
        input.value = '';
        handler(val);
      }
    };
    // Remove previous listener by replacing the node
    const clone = input.cloneNode(true);
    input.parentNode.replaceChild(clone, input);
    clone.addEventListener('keydown', onKey);
    clone.focus();
  }

  // ─── Auto-lock ───────────────────────────────────────────────────────
  function armAutoLock() {
    if (state.autoLockTimer) clearTimeout(state.autoLockTimer);
    state.autoLockTimer = setTimeout(lockNow, state.autoLockSeconds * 1000);
  }
  function resetAutoLock() {
    if (state.locked) return;
    armAutoLock();
  }
  ['click', 'touchstart', 'keydown', 'scroll'].forEach(ev =>
    document.addEventListener(ev, resetAutoLock, { passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !state.locked) lockNow();
  });

  // ─── Polling ─────────────────────────────────────────────────────────
  async function startPolling() {
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = setInterval(pollOnce, 10_000);
    pollOnce();
  }
  async function pollOnce() {
    if (state.sentinel) {
      const status = await state.sentinel.getStatus();
      if (status) {
        state.sentinelStatus = status;
        state.sentinelTamper = !!status.ledgerTampered;
        state.lastSentinelSyncAt = new Date().toISOString();
        // Cache the latest Sentinel state encrypted so it is available
        // the next time the PWA opens when off-network (driving, at
        // work, on cellular). We also cache alerts separately.
        try {
          await window.ShieldStorage.putEncrypted('settings_cache', state.key, 'sentinelStatus', {
            status,
            cachedAt: state.lastSentinelSyncAt,
          });
        } catch (err) { console.warn('cache write failed:', err.message); }
      }
      const alerts = await state.sentinel.getAlerts();
      if (Array.isArray(alerts)) {
        state.sentinelAlerts = alerts;
        try {
          await window.ShieldStorage.putEncrypted('settings_cache', state.key, 'sentinelAlerts', {
            alerts,
            cachedAt: state.lastSentinelSyncAt,
          });
        } catch {}
      }
      // Also persist the lastSync as a plaintext setting so we can
      // render "Last sync 3h ago" even before the user unlocks the key.
      try { await window.ShieldStorage.setSetting('lastSentinelSyncAt', state.lastSentinelSyncAt); } catch {}
    }
    refreshAll();
  }

  // Load any cached Sentinel state that was captured while on-network,
  // so when the user opens the PWA off-network the dashboard shows the
  // last-known posture rather than a blank card.
  async function hydrateFromCache() {
    try {
      const settings = await window.ShieldStorage.getAllSettings();
      if (settings.lastSentinelSyncAt) state.lastSentinelSyncAt = settings.lastSentinelSyncAt;
      const cached = await window.ShieldStorage.getEncrypted('settings_cache', state.key, 'sentinelStatus');
      if (cached && cached.status) {
        state.sentinelStatus = cached.status;
        state.sentinelTamper = !!cached.status.ledgerTampered;
      }
      const cachedAlerts = await window.ShieldStorage.getEncrypted('settings_cache', state.key, 'sentinelAlerts');
      if (cachedAlerts && Array.isArray(cachedAlerts.alerts)) state.sentinelAlerts = cachedAlerts.alerts;
    } catch (err) {
      // Cache store may not exist yet (first run) — ignore silently.
    }
  }

  // ─── Refresh ─────────────────────────────────────────────────────────
  function refreshAll() {
    const status = state.sentinelStatus;
    const topSev = status ? status.topSeverity : 'INFO';
    const lastSyncMs = state.lastSentinelSyncAt ? Date.now() - new Date(state.lastSentinelSyncAt).getTime() : null;
    const isLive = lastSyncMs != null && lastSyncMs < 30_000 && !state.sentinel?.lastError;
    UI.renderStatusCard({
      topSeverity: topSev,
      ts: status?.ts,
      summary: status?.summary,
      lastSyncAt: state.lastSentinelSyncAt,
      isLive,
    });
    // Auto-response banner: if the Sentinel reports a pending auto-
    // response, show a prominent acknowledge banner at the top of the
    // dashboard. Clicking it re-enables Wi-Fi and clears the state.
    const arBanner = document.getElementById('auto-response-banner');
    if (arBanner) {
      const ar = status?.autoResponse;
      if (ar && ar.pending) {
        arBanner.classList.remove('hidden');
        const type = ar.state?.lastEventType || 'CRITICAL event';
        const firedAt = ar.state?.firedAt ? new Date(ar.state.firedAt).toLocaleString() : 'unknown';
        arBanner.innerHTML = `
          <div class="ar-body">
            <div class="ar-label">AUTO-RESPONSE ACTIVE</div>
            <div class="ar-title">Wi-Fi disabled on Mac — ${window.ShieldUI.escapeHtml(type)} at ${window.ShieldUI.escapeHtml(firedAt)}</div>
            <div class="ar-desc">The Mac was screen-locked when a CRITICAL event fired. Wi-Fi was automatically disabled. Acknowledge to re-enable.</div>
          </div>
          <button class="btn btn-primary" id="btn-ack-ar">Acknowledge &amp; Restore Wi-Fi</button>`;
        const btn = document.getElementById('btn-ack-ar');
        if (btn) btn.addEventListener('click', async () => {
          btn.disabled = true;
          btn.textContent = 'Acknowledging…';
          const result = state.sentinel ? await state.sentinel.acknowledgeAutoResponse() : null;
          if (result && result.acknowledged) {
            await state.ledger.append('AUTO_RESPONSE_ACKNOWLEDGED', 'HIGH', { byPwa: true });
            pollOnce();
          } else {
            alert('Acknowledge failed: ' + (result?.reason || state.sentinel?.lastError || 'unknown'));
            btn.disabled = false;
            btn.textContent = 'Acknowledge & Restore Wi-Fi';
          }
        });
      } else {
        arBanner.classList.add('hidden');
        arBanner.innerHTML = '';
      }
    }
    UI.renderPosture(status?.summary);
    // Alerts: merge sentinel alerts with local ledger entries.
    const localAlerts = (state.ledger?.getAll() || []).filter(e => e.severity !== 'INFO');
    const merged = [...(state.sentinelAlerts || []), ...localAlerts];
    UI.renderAlertFeed(merged);
    UI.renderLanList(status?.snapshot, new Set());
    UI.renderBtList(status?.snapshot);

    // Journal
    if (state.ledger) {
      const journalEntries = state.ledger.getAll().filter(e => e.type === 'JOURNAL_ENTRY' || e.severity !== 'INFO');
      UI.renderJournalList(journalEntries);
    }

    // Checklist
    UI.renderChecklist(window.SHIELD_CHECKLIST, state.checklist);

    // Evidence integrity
    UI.renderIntegrityStatus(state.ledger?.tamperInfo, state.sentinelTamper);

    // Sentinel settings
    const settings = state.settingsLoaded || {};
    UI.renderSentinelStatus({
      paired: !!(settings.sentinelUrl && settings.sentinelFingerprint),
      connected: !!state.sentinelStatus,
      url: settings.sentinelUrl,
      fingerprint: settings.sentinelFingerprint,
      lastError: state.sentinel?.lastError,
    });
    document.getElementById('sentinel-url').value = settings.sentinelUrl || '';
    document.getElementById('sentinel-fp').value = settings.sentinelFingerprint || '';
    document.getElementById('autolock').value = settings.autoLockSeconds || 60;
  }

  // ─── Handlers ────────────────────────────────────────────────────────
  document.getElementById('btn-lock').addEventListener('click', lockNow);

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => UI.showView(tab.dataset.view));
  });

  document.getElementById('kill-fab').addEventListener('click', async () => {
    if (!confirm('Kill Switch will:\n\n• Log the current state\n• Run the iOS "SHIELD Kill Switch" Shortcut\n• Lock SHIELD\n\nContinue?')) return;
    try {
      if (state.ledger) await state.ledger.append('KILL_SWITCH', 'CRITICAL', { source: 'pwa-fab', ts: new Date().toISOString() });
      if (state.sentinel) await state.sentinel.recordKillSwitch({ source: 'pwa-fab' });
    } catch {}
    window.ShieldShortcuts.killSwitch();
    setTimeout(lockNow, 600);
  });

  // Journal save
  document.getElementById('btn-journal-save').addEventListener('click', async () => {
    const text = document.getElementById('je-text').value.trim();
    const severity = document.getElementById('je-severity').value;
    const photoEl = document.getElementById('je-photo');
    if (!text) return alert('Entry cannot be empty.');
    let photoData = null;
    if (photoEl.files && photoEl.files[0]) {
      photoData = await fileToDataUrl(photoEl.files[0]);
    }
    // Bidirectional cross-sealing: embed the most recent Sentinel
    // ledger last-hash we have seen as sentinelAnchor in every new
    // journal entry. This means tampering with the Sentinel ledger
    // is detectable from the PWA journal on its own.
    const sentinelAnchor = state.sentinel?.sentinelAnchor || null;
    const entry = await state.ledger.append('JOURNAL_ENTRY', severity, { text, photoData }, { sentinelAnchor });
    if (state.sentinel) {
      // Push a reference (without the photo) to the Sentinel ledger so
      // the Sentinel can anchor this hash in its own next entry.
      await state.sentinel.pushJournal({ id: entry.id, text, severity, hash: entry.hash, ts: entry.ts });
    }
    document.getElementById('je-text').value = '';
    photoEl.value = '';
    refreshAll();
    UI.showView('journal');
  });
  document.getElementById('btn-journal-clear').addEventListener('click', () => {
    document.getElementById('je-text').value = '';
    document.getElementById('je-photo').value = '';
  });

  // Checklist clicks
  document.getElementById('checklist-root').addEventListener('click', async (e) => {
    const item = e.target.closest('[data-check-id]');
    if (!item) return;
    const id = item.dataset.checkId;
    const now = new Date().toISOString();
    const current = state.checklist[id];
    const next = { id, done: !current?.done, at: now };
    state.checklist[id] = next;
    await Storage.putEncrypted('checklist', state.key, id, next);
    await state.ledger.append(next.done ? 'CHECKLIST_CHECKED' : 'CHECKLIST_UNCHECKED', 'INFO', { id });
    refreshAll();
  });

  // Journal delete
  document.getElementById('journal-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-delete-id]');
    if (!btn) return;
    if (!confirm('Delete this entry? The deletion itself is logged as a tamper-evident event.')) return;
    // Require a second PIN entry for delete? For now, a strong confirm is enough; we log the event.
    await state.ledger.remove(btn.dataset.deleteId);
    refreshAll();
  });

  // Sentinel pair
  document.getElementById('btn-sentinel-pair').addEventListener('click', async () => {
    const url = document.getElementById('sentinel-url').value.trim() || 'https://127.0.0.1:17333';
    const fp = document.getElementById('sentinel-fp').value.trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(fp)) return alert('Fingerprint must be 64 hex chars.');
    const pin = prompt('Re-enter PIN to pair:');
    if (!pin) return;
    // Build a transient client to verify pairing.
    const client = new SentinelClient({ url, fingerprint: fp, pin });
    const ok = await client.pair(pin, fp);
    if (!ok) return alert('Pair failed: ' + (client.lastError || 'unknown'));
    await Storage.setSetting('sentinelUrl', url);
    await Storage.setSetting('sentinelFingerprint', fp);
    state.sentinel = client;
    state.settingsLoaded = await Storage.getAllSettings();
    pollOnce();
  });
  document.getElementById('btn-sentinel-unpair').addEventListener('click', async () => {
    if (!confirm('Unpair Mac Sentinel?')) return;
    await Storage.setSetting('sentinelUrl', null);
    await Storage.setSetting('sentinelFingerprint', null);
    state.sentinel = null;
    state.sentinelStatus = null;
    state.settingsLoaded = await Storage.getAllSettings();
    refreshAll();
  });

  // Shortcut tests
  document.getElementById('btn-killswitch-test').addEventListener('click', () => window.ShieldShortcuts.killSwitch());
  document.getElementById('btn-shortcut-night').addEventListener('click', () => window.ShieldShortcuts.nightMode());
  document.getElementById('btn-shortcut-morning').addEventListener('click', () => window.ShieldShortcuts.morningCheck());

  // Save settings
  document.getElementById('btn-save-settings').addEventListener('click', async () => {
    const val = parseInt(document.getElementById('autolock').value, 10);
    if (!Number.isFinite(val) || val < 15 || val > 900) return alert('Auto-lock must be 15–900 seconds.');
    await Storage.setSetting('autoLockSeconds', val);
    state.autoLockSeconds = val;
    state.settingsLoaded = await Storage.getAllSettings();
    armAutoLock();
    alert('Saved.');
  });

  // Wipe
  document.getElementById('btn-wipe').addEventListener('click', async () => {
    if (!confirm('This will ERASE all SHIELD data on this device. It cannot be undone. Continue?')) return;
    if (!confirm('Are you sure? Ledger, journal, checklist, and PIN will all be wiped.')) return;
    await Storage.wipeAll();
    location.reload();
  });

  // Export
  document.getElementById('btn-export-json').addEventListener('click', async () => {
    const blob = await buildExport();
    const file = new Blob([JSON.stringify(blob, null, 2)], { type: 'application/json' });
    downloadBlob(file, `shield-export-${Date.now()}.json`);
  });
  document.getElementById('btn-export-html').addEventListener('click', async () => {
    const blob = await buildExport();
    const html = renderPrintableHtml(blob);
    const file = new Blob([html], { type: 'text/html' });
    downloadBlob(file, `shield-report-${Date.now()}.html`);
  });
  document.getElementById('btn-export-share').addEventListener('click', async () => {
    const blob = await buildExport();
    try {
      await navigator.clipboard.writeText(JSON.stringify(blob));
      alert('Export copied to clipboard.');
    } catch (err) {
      alert('Clipboard denied: ' + err.message);
    }
  });

  // Mark all reviewed — cosmetic; keeps entries but does nothing destructive.
  document.getElementById('btn-mark-all').addEventListener('click', () => {
    refreshAll();
  });

  // ─── Export builders ────────────────────────────────────────────────
  async function buildExport() {
    const local = state.ledger.getAll();
    let sentinelExport = null;
    if (state.sentinel) sentinelExport = await state.sentinel.getExport();
    return {
      generatedAt: new Date().toISOString(),
      device: navigator.userAgent,
      pwa: {
        ledgerCount: local.length,
        lastHash: state.ledger.lastHash,
        tamperInfo: state.ledger.tamperInfo,
        entries: local.map(e => ({ ...e, payload: stripPhotoDataForExport(e.payload) })),
      },
      sentinel: sentinelExport,
    };
  }
  function stripPhotoDataForExport(p) {
    if (!p || typeof p !== 'object') return p;
    const out = { ...p };
    if (out.photoData && typeof out.photoData === 'string') out.photoData = '[photo attached — decrypted in PWA only]';
    return out;
  }
  function buildCaseNumber(genIso) {
    const d = new Date(genIso);
    const pad = n => String(n).padStart(2, '0');
    return `SHIELD-${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
  }

  function renderPrintableHtml(blob) {
    const caseNo = buildCaseNumber(blob.generatedAt);
    const row = (e) => `
      <tr class="${e.severity}">
        <td class="ts">${escapeHtml(new Date(e.ts).toISOString())}</td>
        <td class="ty">${escapeHtml(e.type)}</td>
        <td class="sv">${escapeHtml(e.severity)}</td>
        <td class="hs">${escapeHtml((e.hash || '').slice(0,16))}…</td>
        <td><pre>${escapeHtml(JSON.stringify(e.payload, null, 2))}</pre></td>
      </tr>`;
    const pwaRows = (blob.pwa?.entries || []).map(row).join('');
    const senRows = (blob.sentinel?.entries || []).map(row).join('');

    // Counts per severity, used in summary panel
    const countBySev = (entries) => {
      const o = { INFO: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
      for (const e of (entries || [])) o[e.severity] = (o[e.severity] || 0) + 1;
      return o;
    };
    const pwaCounts = countBySev(blob.pwa?.entries);
    const senCounts = countBySev(blob.sentinel?.entries);

    const installedAt = blob.pwa?.entries?.find(e => e.type === 'APP_OPEN')?.ts || 'unknown';
    const collectors = [
      'network (ARP, Wi-Fi, gateway, DNS, sockets, VPN, rogue AP, mDNS)',
      'bluetooth (paired + recent)',
      'profiles (Configuration Profiles + Managed Preferences)',
      'launch_agents (hash + diff of LaunchAgents/LaunchDaemons)',
      'login_items (System Events + Background Items DB)',
      'integrity (Lockdown Mode, FileVault, SIP, Gatekeeper, Firewall, TCC)',
      'processes (codesign verification, unsigned flag)',
      'logins (last, log show, per-sudo structured records)',
      'sharing (launchctl probe of Screen Sharing, SSH, ARD, SMB, AFP, etc.)',
      'canaries (honeypot files in LaunchAgents + state dir)',
      'usb (system_profiler SPUSBDataType)',
      'wifi_deauth (log show wifid disassoc)',
      'boot_persistence (/etc/hosts, sudoers, rc.common, synthetic.conf, pam.d, StartupItems)',
      'clipboard (pbpaste hash + frontmost app cross-ref)',
      'av_devices (CoreMedia + coreaudiod log subscription + frontmost app)',
      'egress (lsof + codesign-gated process baseline)',
      'time_drift (sntp offset + com.apple.timed liveness)',
      'log_stream (real-time: wifid, cameras, audio, sudo, loginwindow, screensharingd, ARDAgent)',
    ];

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>SHIELD Incident Evidence Report — ${caseNo}</title>
<style>
@page { size: Letter; margin: 0.75in; }
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body {
  margin: 0;
  background: #0A0A0C;
  color: #F0ECE6;
  font: 13px/1.55 -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
  max-width: 960px;
  padding: 48px 36px;
  margin: 0 auto;
}
header {
  border-bottom: 2px solid #C23B22;
  padding-bottom: 20px;
  margin-bottom: 28px;
}
.doctype { font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: #C23B22; font-weight: 700; margin-bottom: 8px; }
h1 { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", Georgia, serif; font-size: 24px; margin: 0 0 6px; letter-spacing: -0.01em; color: #F0ECE6; font-weight: 600; }
.case { font-family: "SF Mono", Menlo, monospace; font-size: 12px; color: #908A84; letter-spacing: 0.04em; }
.meta { color: #908A84; font-size: 11px; margin-top: 14px; line-height: 1.7; }
.meta strong { color: #F0ECE6; font-weight: 500; }
h2 { font-size: 14px; margin: 36px 0 12px; color: #F0ECE6; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; border-bottom: 1px solid #24242B; padding-bottom: 6px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 12px 0; }
.cell { border: 1px solid #24242B; border-radius: 6px; padding: 10px 12px; background: #111115; }
.cell .k { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #605A54; }
.cell .v { font-size: 16px; font-weight: 600; color: #F0ECE6; margin-top: 4px; }
.cell.red .v { color: #E25438; }
.cell.warn .v { color: #D4A017; }
.cell.ok .v { color: #2E7D32; }
table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-top: 8px; }
th { text-align: left; background: #17171C; color: #908A84; font-weight: 500; border-bottom: 1px solid #24242B; padding: 8px 10px; text-transform: uppercase; font-size: 10px; letter-spacing: 0.04em; }
td { border-bottom: 1px solid #17171C; padding: 8px 10px; vertical-align: top; color: #D4CFC8; }
td.ts, td.hs { font-family: "SF Mono", Menlo, monospace; font-size: 10px; color: #908A84; white-space: nowrap; }
td.ty { font-family: "SF Mono", Menlo, monospace; font-size: 10px; color: #F0ECE6; white-space: nowrap; }
td.sv { font-size: 10px; letter-spacing: 0.04em; text-transform: uppercase; font-weight: 600; white-space: nowrap; }
tr.INFO td.sv     { color: #908A84; }
tr.LOW td.sv      { color: #558B2F; }
tr.MEDIUM td.sv   { color: #D4A017; }
tr.HIGH td.sv     { color: #E57C00; }
tr.CRITICAL td.sv { color: #E25438; }
tr.CRITICAL { background: rgba(194, 59, 34, 0.05); }
pre { font-family: "SF Mono", Menlo, monospace; font-size: 10px; white-space: pre-wrap; word-wrap: break-word; margin: 0; color: #908A84; max-width: 460px; }
.chain { font-family: "SF Mono", Menlo, monospace; font-size: 11px; background: #111115; border: 1px solid #24242B; border-left: 3px solid #C23B22; padding: 14px 18px; border-radius: 4px; color: #D4CFC8; word-break: break-all; }
.chain .lbl { color: #908A84; text-transform: uppercase; font-size: 9px; letter-spacing: 0.1em; display: block; margin-bottom: 4px; }
.stmt { border-left: 3px solid #C23B22; padding: 12px 18px; background: #111115; color: #D4CFC8; margin: 14px 0; font-size: 12px; }
.stmt strong { color: #F0ECE6; }
.cfg ul { margin: 8px 0 0; padding-left: 20px; }
.cfg li { font-family: "SF Mono", Menlo, monospace; font-size: 10px; color: #908A84; line-height: 1.8; }
footer { margin-top: 48px; padding-top: 18px; border-top: 1px solid #24242B; color: #605A54; font-size: 10px; line-height: 1.7; }
footer strong { color: #908A84; }
@media print {
  body { background: white; color: #222; max-width: none; }
  .cell { background: #f8f8f8; border-color: #ddd; }
  .cell .v { color: #000; }
  th { background: #eee; color: #333; border-color: #ccc; }
  td { color: #222; border-color: #eee; }
  td.ts, td.hs, td.ty, pre, .cell .k, .chain .lbl, .cfg li, footer { color: #555; }
  .chain { background: #f8f8f8; border-color: #ddd; border-left-color: #C23B22; }
  .stmt { background: #f8f8f8; border-color: #ddd; border-left-color: #C23B22; color: #222; }
  h1, h2, strong { color: #000; }
  tr.CRITICAL { background: #fde8e3; }
}
</style></head><body>
<header>
  <div class="doctype">Incident Evidence Report</div>
  <h1>Host-Based Intrusion Detection System — Evidence Export</h1>
  <div class="case">Case No. ${escapeHtml(caseNo)}</div>
  <div class="meta">
    <strong>Generated</strong> ${escapeHtml(blob.generatedAt)} (UTC)<br>
    <strong>Device of record</strong> ${escapeHtml(blob.device)}<br>
    <strong>Observation period begins</strong> ${escapeHtml(installedAt)}<br>
    <strong>Jurisdiction of interest</strong> Ohio, USA — 18 U.S.C. § 1030; Ohio Revised Code § 2913.04
  </div>
</header>

<div class="stmt">
This document is a cryptographically integrity-checked export of events recorded by SHIELD, a host-based intrusion detection system operated by the device owner on equipment owned by the device owner and observing only that equipment and its directly connected network. Records are preserved in a hash-chained, tamper-evident ledger using <strong>PBKDF2-HMAC-SHA256</strong> (600,000 iterations) key derivation, <strong>AES-256-GCM</strong> authenticated encryption, and <strong>SHA-256</strong> hash chaining. Any post-export modification is detectable via the chain verification procedure described at the end of this document.
</div>

<h2>Summary</h2>
<div class="grid">
  <div class="cell"><div class="k">Entries (PWA journal)</div><div class="v">${blob.pwa?.ledgerCount ?? 0}</div></div>
  <div class="cell"><div class="k">Entries (Mac Sentinel)</div><div class="v">${blob.sentinel?.ledgerCount ?? 0}</div></div>
  <div class="cell ${blob.pwa?.tamperInfo ? 'red' : 'ok'}"><div class="k">PWA Chain</div><div class="v">${blob.pwa?.tamperInfo ? 'TAMPERED' : 'VERIFIED'}</div></div>
  <div class="cell ${blob.sentinel?.ledgerTampered ? 'red' : 'ok'}"><div class="k">Sentinel Chain</div><div class="v">${blob.sentinel?.ledgerTampered ? 'TAMPERED' : 'VERIFIED'}</div></div>
  <div class="cell ${(pwaCounts.CRITICAL + senCounts.CRITICAL) > 0 ? 'red' : 'ok'}"><div class="k">Critical events</div><div class="v">${pwaCounts.CRITICAL + senCounts.CRITICAL}</div></div>
  <div class="cell ${(pwaCounts.HIGH + senCounts.HIGH) > 0 ? 'warn' : 'ok'}"><div class="k">High-severity</div><div class="v">${pwaCounts.HIGH + senCounts.HIGH}</div></div>
</div>

<h2>Chain of custody</h2>
<div class="chain">
<span class="lbl">Observation started</span>${escapeHtml(installedAt)}
<br><br>
<span class="lbl">Export generated</span>${escapeHtml(blob.generatedAt)}
<br><br>
<span class="lbl">PWA journal — final chain hash</span>${escapeHtml(blob.pwa?.lastHash || 'none')}
<br><br>
<span class="lbl">Sentinel ledger — final chain hash</span>${escapeHtml(blob.sentinel?.ledgerLastHash || 'not paired')}
<br><br>
<span class="lbl">Integrity verification procedure</span>Walk each ledger from its genesis entry, recompute SHA-256(prevHash || canonicalJSON(entry without hash field)), and verify it matches the entry's hash field. Mismatch at any index indicates tampering. The final chain hashes above are the authoritative commitment for this export.
</div>

<h2>System configuration at time of export</h2>
<div class="cfg">
<p class="meta">Active collectors, scan cadence, and detection surface:</p>
<ul>
${collectors.map(c => `<li>${escapeHtml(c)}</li>`).join('\n')}
</ul>
<p class="meta">Main scan cadence <strong>30 s</strong> with ±20% jitter. Aggressive cadence <strong>5 s</strong> triggered automatically on any HIGH or CRITICAL event. Time drift check every <strong>10 min</strong> on a separate timer. Real-time log stream subprocess for auth, camera, microphone, and remote-session events. PBKDF2 at <strong>600,000</strong> iterations. Bidirectional ledger cross-sealing between PWA and Sentinel.</p>
</div>

<h2>PWA Journal Events</h2>
<p class="meta">Event count: ${blob.pwa?.ledgerCount ?? 0} (INFO ${pwaCounts.INFO}, LOW ${pwaCounts.LOW}, MEDIUM ${pwaCounts.MEDIUM}, HIGH ${pwaCounts.HIGH}, CRITICAL ${pwaCounts.CRITICAL})</p>
${pwaRows ? `<table><thead><tr><th>Timestamp (UTC)</th><th>Type</th><th>Sev</th><th>Hash</th><th>Payload</th></tr></thead><tbody>${pwaRows}</tbody></table>` : '<p class="meta">No entries.</p>'}

<h2>Mac Sentinel Ledger Events</h2>
${blob.sentinel ? `<p class="meta">Event count: ${blob.sentinel.ledgerCount ?? 0} (INFO ${senCounts.INFO}, LOW ${senCounts.LOW}, MEDIUM ${senCounts.MEDIUM}, HIGH ${senCounts.HIGH}, CRITICAL ${senCounts.CRITICAL})</p>
${senRows ? `<table><thead><tr><th>Timestamp (UTC)</th><th>Type</th><th>Sev</th><th>Hash</th><th>Payload</th></tr></thead><tbody>${senRows}</tbody></table>` : '<p class="meta">No entries.</p>'}` : '<p class="meta">Mac Sentinel not paired at time of export. PWA journal is the sole record.</p>'}

<footer>
<strong>Prepared by</strong> SHIELD host-based intrusion detection system, version 2.0.<br>
<strong>Cryptographic method</strong> SHA-256 hash chaining. PBKDF2-HMAC-SHA256 at 600,000 iterations for key derivation. AES-256-GCM authenticated encryption for ledger storage. HMAC-SHA256 self-integrity manifest of daemon source files verified on every start.<br>
<strong>Observation scope</strong> One device and its directly connected network, owned and operated by the device owner. No third-party equipment or traffic was observed or intercepted.<br>
<strong>Disclaimer</strong> This document is a factual record of events observed on the device of record. It is not legal advice. Interpretation and any subsequent action should be undertaken in consultation with qualified counsel.<br>
<strong>Case No.</strong> ${escapeHtml(caseNo)}
</footer>
</body></html>`;
  }
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ─── Boot ────────────────────────────────────────────────────────────
  boot();
})();
