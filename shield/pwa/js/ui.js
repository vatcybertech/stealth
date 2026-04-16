// SHIELD PWA — UI renderers.
//
// Pure render functions. No state, no fetches. Given an object, write it
// to the DOM. All actual state lives in app.js.

'use strict';

(function (window) {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatRelativeTime(iso) {
    if (!iso) return '—';
    const then = new Date(iso).getTime();
    const diff = Date.now() - then;
    if (diff < 5000) return 'just now';
    if (diff < 60_000) return Math.floor(diff / 1000) + 's ago';
    if (diff < 3_600_000) return Math.floor(diff / 60_000) + 'm ago';
    if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + 'h ago';
    return Math.floor(diff / 86_400_000) + 'd ago';
  }

  function threatLevelFromSeverity(sev) {
    switch (sev) {
      case 'CRITICAL': return 'critical';
      case 'HIGH':     return 'danger';
      case 'MEDIUM':   return 'warn';
      default:         return 'safe';
    }
  }
  function threatHeadline(sev) {
    switch (sev) {
      case 'CRITICAL': return 'THREAT DETECTED';
      case 'HIGH':     return 'ALERT';
      case 'MEDIUM':   return 'CAUTION';
      default:         return 'SECURE';
    }
  }

  function renderStatusCard({ topSeverity, ts, summary, lastSyncAt, isLive }) {
    const headline = $('#status-headline');
    const dot = $('#threat-dot');
    const level = threatLevelFromSeverity(topSeverity || 'INFO');
    headline.textContent = threatHeadline(topSeverity || 'INFO');
    headline.className = 'headline ' + level;
    dot.className = 'threat-dot ' + level;
    $('#status-scan-time').textContent = formatRelativeTime(ts);
    $('#status-ssid').textContent = summary?.ssid || '—';
    $('#status-devices').textContent = summary?.arpCount != null
      ? `${summary.arpCount} LAN · ${summary.btDevices ?? 0} BT`
      : '—';

    // Sync indicator: classifies the Mac Sentinel link's freshness.
    const syncRow = $('#sync-row');
    const syncLabel = $('#sync-label');
    if (!syncRow || !syncLabel) return;
    if (!lastSyncAt) {
      syncRow.className = 'sync-row offline';
      syncLabel.textContent = 'Sentinel link: never synced (pair in Settings)';
      return;
    }
    const ageMs = Date.now() - new Date(lastSyncAt).getTime();
    const ageMin = ageMs / 60000;
    let klass = 'offline';
    let text = `Sentinel link: last sync ${formatRelativeTime(lastSyncAt)}`;
    if (isLive) { klass = 'live'; text = `Sentinel link: LIVE (${formatRelativeTime(lastSyncAt)})`; }
    else if (ageMin < 5)   klass = 'fresh';
    else if (ageMin < 60)  klass = 'stale-1h';
    else if (ageMin < 360) klass = 'stale-6h';
    else                   klass = 'stale-24h';
    syncRow.className = 'sync-row ' + klass;
    syncLabel.textContent = text;
  }

  function renderPosture(summary) {
    const grid = $('#posture-grid');
    if (!summary) { grid.innerHTML = '<div class="posture-item na"><div class="pname">Sentinel</div><div class="pval">Not paired</div></div>'; return; }
    const tiles = [
      { name: 'Lockdown Mode', val: summary.lockdownMode, good: true },
      { name: 'FileVault',     val: summary.fileVault,    good: true },
      { name: 'SIP',           val: summary.sip,          good: true },
      { name: 'Gatekeeper',    val: summary.gatekeeper,   good: true },
      { name: 'Firewall',      val: summary.firewall,     good: true },
    ];
    let html = '';
    for (const t of tiles) {
      const cls = t.val === true ? 'ok' : t.val === false ? 'bad' : 'na';
      const text = t.val === true ? 'ON' : t.val === false ? 'OFF' : '—';
      html += `<div class="posture-item ${cls}"><div class="pname">${escapeHtml(t.name)}</div><div class="pval">${text}</div></div>`;
    }
    html += `<div class="posture-item ${summary.profileCount > 0 ? 'bad' : 'ok'}"><div class="pname">Profiles</div><div class="pval">${summary.profileCount ?? 0}</div></div>`;
    html += `<div class="posture-item ${summary.unsignedCount > 0 ? 'bad' : 'ok'}"><div class="pname">Unsigned</div><div class="pval">${summary.unsignedCount ?? 0}</div></div>`;
    html += `<div class="posture-item ${summary.sharingActive > 0 ? 'bad' : 'ok'}"><div class="pname">Sharing</div><div class="pval">${summary.sharingActive ?? 0}</div></div>`;
    grid.innerHTML = html;
  }

  function renderAlertFeed(alerts) {
    const feed = $('#alert-feed');
    if (!alerts || alerts.length === 0) {
      feed.innerHTML = '<div class="alert-empty">No alerts.</div>';
      return;
    }
    const sorted = [...alerts].sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
    feed.innerHTML = sorted.slice(0, 50).map(a => {
      const payload = a.payload || {};
      const msg = payload.message || payload.svc || payload.device?.name || a.type;
      return `<div class="alert ${escapeHtml(a.severity)}">
        <div class="alert-body">
          <div class="alert-type">${escapeHtml(a.type)} · ${escapeHtml(a.severity)}</div>
          <div class="alert-msg">${escapeHtml(msg)}</div>
          <div class="alert-time">${escapeHtml(formatRelativeTime(a.ts))}</div>
        </div>
      </div>`;
    }).join('');
  }

  function renderLanList(snapshot, whitelistSet) {
    const list = $('#lan-list');
    const arp = snapshot?.network?.arp || [];
    if (arp.length === 0) {
      list.innerHTML = '<div class="alert-empty">No LAN data (Sentinel not paired).</div>';
      return;
    }
    list.innerHTML = arp.map(d => {
      const wl = whitelistSet?.has(d.fingerprint) || whitelistSet?.has(d.mac);
      const cls = wl ? 'known' : 'unknown';
      return `<div class="dev-row ${cls}">
        <div>
          <div>${escapeHtml(d.ip || '?')}</div>
          <div class="dev-id">${escapeHtml(d.mac || '?')} · ${escapeHtml(d.iface || '')}</div>
        </div>
        <div><small>${wl ? 'known' : 'unknown'}</small></div>
      </div>`;
    }).join('');
  }

  function renderBtList(snapshot) {
    const list = $('#bt-list');
    if (!snapshot?.bluetooth?.available) {
      list.innerHTML = '<div class="alert-empty">Bluetooth data requires Mac Sentinel (iOS Safari cannot enumerate BT).</div>';
      return;
    }
    const devices = snapshot.bluetooth.devices || [];
    if (devices.length === 0) {
      list.innerHTML = '<div class="alert-empty">No paired or recent BT devices.</div>';
      return;
    }
    list.innerHTML = devices.map(d => {
      const cls = d.connected ? 'known' : 'new';
      return `<div class="dev-row ${cls}">
        <div>
          <div>${escapeHtml(d.name || 'Unknown')}</div>
          <div class="dev-id">${escapeHtml(d.address || '?')} · ${escapeHtml(d.type || '')}</div>
        </div>
        <div><small>${d.connected ? 'connected' : 'paired'}</small></div>
      </div>`;
    }).join('');
  }

  function renderChecklist(items, state) {
    const root = $('#checklist-root');
    // Group by phase
    const phases = {};
    for (const it of items) {
      if (!phases[it.phase]) phases[it.phase] = [];
      phases[it.phase].push(it);
    }
    let html = '';
    for (const [phase, list] of Object.entries(phases)) {
      const done = list.filter(i => state[i.id]?.done).length;
      html += `<div class="card"><div class="card-header"><h2>${escapeHtml(phase)}</h2><span><small>${done}/${list.length}</small></span></div>`;
      for (const it of list) {
        const cls = state[it.id]?.done ? 'done' : '';
        html += `<div class="check-item ${cls}" data-check-id="${escapeHtml(it.id)}">
          <div class="check-box"></div>
          <div style="flex:1">
            <div class="check-title">${escapeHtml(it.title)}</div>
            <div class="check-desc">${escapeHtml(it.desc)}</div>
            ${state[it.id]?.at ? `<div class="check-desc"><small>Checked ${formatRelativeTime(state[it.id].at)}</small></div>` : ''}
          </div>
        </div>`;
      }
      html += `</div>`;
    }
    root.innerHTML = html;
  }

  function renderJournalList(entries, onDelete) {
    const list = $('#journal-list');
    if (!entries || entries.length === 0) {
      list.innerHTML = '<div class="alert-empty">No entries yet.</div>';
      return;
    }
    const sorted = [...entries].sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
    list.innerHTML = sorted.map(e => {
      const img = e.payload?.photoData ? `<img src="${e.payload.photoData}" alt="journal photo">` : '';
      return `<div class="journal-entry">
        <div class="je-head">
          <span>${escapeHtml(e.type)} · ${escapeHtml(e.severity)}</span>
          <span>${escapeHtml(new Date(e.ts).toLocaleString())}</span>
        </div>
        <div class="je-body">${escapeHtml(e.payload?.text || e.type)}</div>
        ${img}
        <div style="margin-top:8px;"><button class="btn btn-ghost" data-delete-id="${escapeHtml(e.id)}">Delete (logged)</button></div>
      </div>`;
    }).join('');
  }

  function renderIntegrityStatus(ledgerTamper, sentinelTamper) {
    const el = $('#integrity-status');
    const pwaOk = !ledgerTamper;
    const macOk = sentinelTamper === null || sentinelTamper === undefined;
    const bad = !pwaOk || sentinelTamper === true;
    el.innerHTML = `
      <div class="banner ${pwaOk ? 'info' : 'danger'}">
        <strong>PWA journal:</strong>&nbsp;${pwaOk ? 'OK — hash chain verified.' : 'TAMPER DETECTED — ' + escapeHtml(JSON.stringify(ledgerTamper))}
      </div>
      <div class="banner ${sentinelTamper === true ? 'danger' : 'info'}">
        <strong>Mac Sentinel ledger:</strong>&nbsp;${sentinelTamper === true ? 'TAMPER DETECTED' : sentinelTamper === null || sentinelTamper === undefined ? 'Not checked (Sentinel not paired).' : 'OK — hash chain verified.'}
      </div>
    `;
    return !bad;
  }

  function renderSentinelStatus(state) {
    const el = $('#sentinel-status');
    if (!state) { el.innerHTML = '<div class="banner info">Not paired. Enter the Sentinel URL and fingerprint below.</div>'; return; }
    const { paired, connected, fingerprint, url, lastError } = state;
    if (!paired) {
      el.innerHTML = '<div class="banner info">Not paired.</div>';
    } else if (connected) {
      el.innerHTML = `<div class="banner info"><strong>Paired and connected.</strong><br><small>URL ${escapeHtml(url)}</small><br><small>FP ${escapeHtml((fingerprint||'').slice(0,16))}…</small></div>`;
    } else {
      el.innerHTML = `<div class="banner warn"><strong>Paired but not reachable.</strong><br><small>${escapeHtml(lastError || 'unknown error')}</small></div>`;
    }
  }

  function showView(viewName) {
    $$('.view').forEach(v => v.classList.add('hidden'));
    const target = $('#view-' + viewName);
    if (target) target.classList.remove('hidden');
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === viewName));
  }

  function showLock(show) {
    $('#lock-screen').classList.toggle('hidden', !show);
    $('#app').classList.toggle('hidden', show);
  }

  function showBanner(el, kind, msg) {
    el.innerHTML = `<div class="banner ${kind}">${escapeHtml(msg)}</div>`;
  }

  window.ShieldUI = {
    $, $$, escapeHtml, formatRelativeTime,
    threatLevelFromSeverity, threatHeadline,
    renderStatusCard, renderPosture, renderAlertFeed,
    renderLanList, renderBtList, renderChecklist,
    renderJournalList, renderIntegrityStatus, renderSentinelStatus,
    showView, showLock, showBanner,
  };
})(window);
