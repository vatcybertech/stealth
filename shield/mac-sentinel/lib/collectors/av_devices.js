// Camera / microphone activation collector.
//
// On macOS, when an app uses the camera or mic, CoreMediaIO and
// coreaudiod log the activation. We query the unified log for the
// last scan window and extract "device started / stopped" events.
// We also grab the current frontmost app so the analyzer can flag
// AV activation with no legitimate frontmost context.
//
// Predicate is broad on purpose — Apple changes the exact log format
// between minor releases and we want to survive that.

'use strict';

const { run } = require('../shell');

// Apps that are legitimately allowed to activate camera or mic.
// You can extend this in state.whitelist.avApps via the PWA.
const DEFAULT_AV_WHITELIST = new Set([
  'FaceTime',
  'Photo Booth',
  'QuickTime Player',
  'zoom.us',
  'Google Chrome',      // Meet / web calls
  'Safari',             // WebRTC
  'Firefox',
  'Microsoft Teams',
  'Slack',              // huddles
  'Webex',
  'Photos',             // live photos playback etc.
  'Camera',
]);

async function getFrontmostApp() {
  const res = await run('/usr/bin/osascript', ['-e',
    'tell application "System Events" to get name of first application process whose frontmost is true'],
    { timeout: 3500 });
  if (res.code !== 0) return null;
  return res.stdout.trim() || null;
}

async function queryAvLogs(windowMinutes = 2) {
  const res = await run(
    '/usr/bin/log',
    ['show', '--last', `${windowMinutes}m`, '--style', 'compact', '--predicate',
      '(process == "coreaudiod") OR (process == "appleh13camerad") OR (process CONTAINS "AppleCamera") OR (process == "VDCAssistant") OR (subsystem == "com.apple.cmio") OR (subsystem == "com.apple.coreaudio")'],
    { timeout: 25000, maxBuffer: 16 * 1024 * 1024 },
  );
  if (res.code !== 0) return { available: false, events: [], error: res.stderr?.trim() || res.error };
  const camActive = [];
  const micActive = [];
  for (const raw of res.stdout.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    if (/(camera|cmio).*(start|activ|open|begin|acquired)/.test(lower)) camActive.push(line);
    if (/(audio|microphone|mic).*(start|activ|open|begin|acquired)/.test(lower)) micActive.push(line);
  }
  return { available: true, camActive, micActive, raw: res.stdout.split('\n').slice(-80) };
}

async function collect() {
  const [logs, frontmost] = await Promise.all([queryAvLogs(2), getFrontmostApp()]);
  return {
    ...logs,
    frontmost: frontmost || null,
    defaultWhitelist: Array.from(DEFAULT_AV_WHITELIST),
    collectedAt: new Date().toISOString(),
  };
}

module.exports = { collect, DEFAULT_AV_WHITELIST };
