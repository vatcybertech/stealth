// Sharing services collector.
//
// macOS exposes a handful of background "Sharing" services under
// launchctl. If any of these are loaded and you didn't enable them
// yourself from System Settings, that is high-signal.
//
// We check both per-user (gui/<uid>) and system (system) launchctl domains
// by name where possible.

'use strict';

const { run } = require('../shell');

const TARGETS = [
  { label: 'Screen Sharing',        svc: 'com.apple.screensharing' },
  { label: 'Remote Management (ARD)', svc: 'com.apple.RemoteDesktop.agent' },
  { label: 'Remote Login (SSH)',    svc: 'com.openssh.sshd' },
  { label: 'File Sharing (SMB)',    svc: 'com.apple.smbd' },
  { label: 'File Sharing (AFP)',    svc: 'com.apple.AppleFileServer' },
  { label: 'Remote Apple Events',   svc: 'com.apple.eppc' },
  { label: 'Internet Sharing (NAT)', svc: 'com.apple.NetworkSharing' },
  { label: 'Bluetooth Sharing',     svc: 'com.apple.bluetoothUserAgent' },
  { label: 'Media Sharing',         svc: 'com.apple.amp.mediasharingd' },
  { label: 'Printer Sharing (cupsd)', svc: 'org.cups.cupsd' },
];

async function loaded(svc) {
  const res = await run('/bin/launchctl', ['print', `system/${svc}`], { timeout: 3500 });
  if (res.code === 0) return { loaded: true, scope: 'system' };
  const user = await run('/bin/launchctl', ['list', svc], { timeout: 3500 });
  if (user.code === 0) return { loaded: true, scope: 'user' };
  return { loaded: false, scope: null };
}

async function collect() {
  const results = [];
  for (const t of TARGETS) {
    const state = await loaded(t.svc);
    results.push({ ...t, ...state });
  }
  const active = results.filter(r => r.loaded);
  return {
    services: results,
    active,
    activeCount: active.length,
    collectedAt: new Date().toISOString(),
  };
}

module.exports = { collect };
