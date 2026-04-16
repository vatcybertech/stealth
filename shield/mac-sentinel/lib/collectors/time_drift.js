// Time drift / timed daemon collector.
//
// Runs on a SEPARATE schedule from the main scan loop (default: 10
// minutes). NTP queries against Apple's time server are rate-limited
// and slow, and running them every 30 seconds would be both rude and
// pointless. sentinel.js calls this collector on its own timer and
// funnels any anomalies through the normal event pipeline.
//
// Signals:
//   - system clock more than 30 seconds off NTP        -> CLOCK_DRIFT CRITICAL
//   - timed (Apple's time daemon) is not loaded/running -> TIMED_KILLED CRITICAL
//
// Why this matters: an attacker who shifts your clock makes every
// timestamp in your evidence ledger unreliable — log correlation
// fails, alert windows go stale, and they can hide activity in the
// resulting gap. Killing `timed` prevents auto-correction.

'use strict';

const { run } = require('../shell');

const DEFAULT_DRIFT_THRESHOLD_SEC = 30;
const DEFAULT_NTP_SERVER = 'time.apple.com';

async function queryNtpOffset(server = DEFAULT_NTP_SERVER) {
  // `sntp -d <server>` prints a line like:
  //   +0.001234 +/- 0.012345 time.apple.com 17.253.84.125
  // The first signed float is the offset in seconds.
  const res = await run('/usr/bin/sntp', ['-d', server], { timeout: 8000 });
  if (res.code !== 0 || !res.stdout) {
    return { available: false, error: res.stderr?.trim() || res.error || 'sntp failed' };
  }
  const lines = res.stdout.split('\n').map(l => l.trim()).filter(Boolean);
  // Find the first line containing a signed float followed by +/-
  for (const line of lines) {
    const m = line.match(/^([+-]?\d+(?:\.\d+)?)\s*\+\/-\s*([\d.]+)\s+(\S+)/);
    if (m) {
      return {
        available: true,
        offsetSec: parseFloat(m[1]),
        errorSec: parseFloat(m[2]),
        server: m[3],
        raw: line,
      };
    }
  }
  // Some sntp builds print a slightly different format — be forgiving
  const looseMatch = lines.find(l => /^[+-]?\d+\.\d+/.test(l));
  if (looseMatch) {
    const offset = parseFloat(looseMatch.match(/^[+-]?\d+\.\d+/)[0]);
    return { available: true, offsetSec: offset, errorSec: null, server, raw: looseMatch };
  }
  return { available: false, error: 'could not parse sntp output', stdout: res.stdout };
}

async function isTimedRunning() {
  // `launchctl print system/com.apple.timed` returns zero when loaded.
  // Some macOS versions put it under a per-user domain too.
  const a = await run('/bin/launchctl', ['print', 'system/com.apple.timed'], { timeout: 3500 });
  if (a.code === 0) return { running: true, scope: 'system' };
  const b = await run('/bin/launchctl', ['list', 'com.apple.timed'], { timeout: 3500 });
  if (b.code === 0) return { running: true, scope: 'user' };
  return { running: false, scope: null, error: (a.stderr || b.stderr || '').trim() };
}

async function collect({ driftThresholdSec = DEFAULT_DRIFT_THRESHOLD_SEC, server = DEFAULT_NTP_SERVER } = {}) {
  const [ntp, timed] = await Promise.all([
    queryNtpOffset(server),
    isTimedRunning(),
  ]);
  const absOffset = ntp.available && typeof ntp.offsetSec === 'number' ? Math.abs(ntp.offsetSec) : null;
  return {
    available: ntp.available,
    offsetSec: ntp.available ? ntp.offsetSec : null,
    absOffsetSec: absOffset,
    driftThresholdSec,
    drifted: absOffset != null && absOffset > driftThresholdSec,
    server: ntp.server || server,
    timed,
    collectedAt: new Date().toISOString(),
  };
}

module.exports = { collect, DEFAULT_DRIFT_THRESHOLD_SEC };
