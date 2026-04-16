// Login / authentication event collector.
//
// Sources:
//   last                       recent login session history
//   log show --last 1h --predicate '...' authentication events
//
// We're looking for:
//   - Recent successful and failed interactive logins
//   - SSH logins (if SSH is enabled, which it shouldn't be)
//   - sudo / su invocations
//   - screensharing sessions

'use strict';

const { run, runLines } = require('../shell');

async function collectLast(limit = 25) {
  const lines = await runLines('/usr/bin/last', ['-n', String(limit)], { timeout: 6000 });
  const out = [];
  for (const line of lines) {
    if (!line || /wtmp begins/i.test(line)) continue;
    // Columns are variable but typically:
    //   user  tty  host  date  [still logged in | - endtime (duration)]
    const parts = line.split(/\s+/);
    if (parts.length < 3) continue;
    out.push({
      user: parts[0],
      tty: parts[1],
      host: parts[2],
      when: parts.slice(3, 7).join(' '),
      raw: line,
    });
  }
  return out;
}

async function collectAuthLog(minutes = 60) {
  // `log show` is available to any user; it can show a surprising amount.
  // We scope to a short window to keep the call fast.
  const res = await run(
    '/usr/bin/log',
    ['show', '--last', `${minutes}m`, '--style', 'compact', '--predicate',
     'eventMessage CONTAINS[c] "authentication" OR eventMessage CONTAINS[c] "sudo" OR eventMessage CONTAINS[c] "su:" OR eventMessage CONTAINS[c] "login"'],
    { timeout: 30000, maxBuffer: 32 * 1024 * 1024 },
  );
  if (res.code !== 0) return { available: false, events: [], error: res.stderr?.trim() || res.error };
  const events = [];
  const sudoEvents = [];   // structured per-sudo records
  const authFailEvents = [];
  let failures = 0;
  let sudoCount = 0;
  // Regex against common sudo log line shapes:
  //   "sudo[12345]: user : TTY=ttys000 ; PWD=/ ; USER=root ; COMMAND=/bin/ls"
  //   "sudo[12345]: user : 3 incorrect password attempts ; TTY=..."
  //   "sudo[12345]: user : command not allowed ; ..."
  const sudoSuccessRe = /sudo\[?\d*\]?:\s*(\S+)\s*:\s*TTY=(\S+)\s*;\s*PWD=(\S+)\s*;\s*USER=(\S+)\s*;\s*COMMAND=(.+?)(?:\s*$|\s*\|)/i;
  const sudoFailRe    = /sudo\[?\d*\]?:\s*(\S+)\s*:\s*(.*incorrect password|.*command not allowed|.*not in the sudoers|.*a password is required|.*authentication failure)/i;
  for (const line of res.stdout.split('\n')) {
    if (!line.trim()) continue;
    if (/fail/i.test(line) && /auth|login|authent/i.test(line)) { failures++; authFailEvents.push(line); }
    if (/sudo/i.test(line)) {
      sudoCount++;
      const ok = line.match(sudoSuccessRe);
      const bad = line.match(sudoFailRe);
      if (bad) {
        sudoEvents.push({
          kind: 'fail',
          user: bad[1],
          reason: bad[2].trim(),
          raw: line,
        });
      } else if (ok) {
        sudoEvents.push({
          kind: 'success',
          user: ok[1],
          tty: ok[2],
          pwd: ok[3],
          asUser: ok[4],
          command: ok[5].trim(),
          raw: line,
        });
      }
    }
    if (events.length < 200) events.push(line);
  }
  return {
    available: true,
    events,
    failures,
    sudoCount,
    sudoEvents,
    sudoFailureCount: sudoEvents.filter(e => e.kind === 'fail').length,
    sudoSuccessCount: sudoEvents.filter(e => e.kind === 'success').length,
    authFailEvents: authFailEvents.slice(-30),
  };
}

async function collect() {
  const [last, auth] = await Promise.all([
    collectLast(25),
    collectAuthLog(60),
  ]);
  return {
    last,
    auth,
    lastCount: last.length,
    authFailureCount: auth.failures || 0,
    authSudoCount: auth.sudoCount || 0,
    collectedAt: new Date().toISOString(),
  };
}

module.exports = { collect };
