// SHIELD Mac Sentinel — startup beacon.
//
// Every time the Sentinel starts (boot, manual restart, LaunchAgent
// respawn), we record the current boot time and compare against the
// previous run's last heartbeat. If the gap between the last
// heartbeat and the current boot time is larger than it should be
// (power loss? unexpected reboot? adversary forced a reboot?), we
// fire an UNEXPECTED_REBOOT HIGH event.
//
// This catches attacker behavior like:
//   - Forcing a kernel panic to clear volatile state
//   - Booting into recovery mode to disable SIP
//   - Replacing a kernel extension that requires a reboot
//   - Unattended power cycling during forensic triage

'use strict';

const fs = require('fs');
const os = require('os');
const { run } = require('./shell');
const { nowIso } = require('./crypto');

function readUptimeMs() {
  // macOS: sysctl kern.boottime returns "{ sec = ..., usec = ... }"
  return new Promise((resolve) => {
    require('child_process').execFile('/usr/sbin/sysctl', ['-n', 'kern.boottime'], { timeout: 2000 }, (err, out) => {
      if (err || !out) return resolve(null);
      const m = out.toString().match(/sec\s*=\s*(\d+)/);
      if (!m) return resolve(null);
      resolve(Date.now() - (parseInt(m[1], 10) * 1000));
    });
  });
}

async function record({ append, stateFile, heartbeatFile }) {
  const uptime = await readUptimeMs();
  let lastHeartbeat = null;
  try {
    if (fs.existsSync(heartbeatFile)) {
      const raw = JSON.parse(fs.readFileSync(heartbeatFile, 'utf8'));
      lastHeartbeat = raw.ts;
    }
  } catch {}
  let prevBeacon = null;
  try {
    if (fs.existsSync(stateFile)) prevBeacon = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {}
  const now = Date.now();
  const bootEpoch = uptime != null ? now - uptime : null;
  const current = {
    bootEpoch,
    sentinelStartedAt: nowIso(),
    sentinelPid: process.pid,
    hostname: os.hostname(),
  };
  try { fs.writeFileSync(stateFile, JSON.stringify(current, null, 2), { mode: 0o600 }); } catch {}

  // Compare: if the previous heartbeat was recent (say, within 10
  // minutes) and the current boot time is AFTER the previous heartbeat,
  // that's a reboot that happened while SHIELD was supposed to be
  // running. That is the pattern we care about.
  if (lastHeartbeat && bootEpoch) {
    const lhMs = new Date(lastHeartbeat).getTime();
    // Fresh-sounding heartbeat (< 10 min before boot) AND boot happened
    // AFTER the last heartbeat = SHIELD was running, then the machine
    // restarted, then SHIELD started again.
    if (bootEpoch > lhMs && (bootEpoch - lhMs) < 10 * 60 * 1000) {
      append('UNEXPECTED_REBOOT', 'HIGH', {
        lastHeartbeat,
        bootEpoch: new Date(bootEpoch).toISOString(),
        gapMs: bootEpoch - lhMs,
        message: `Sentinel was last alive ${Math.round((bootEpoch - lhMs) / 1000)}s before the current boot. Either a reboot happened or the Sentinel was forcibly killed and restarted.`,
      });
    }
  }
  append('BOOT_EVENT', 'INFO', { current, prevBeacon, uptime });
  return current;
}

module.exports = { record };
