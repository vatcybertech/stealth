// Wi-Fi deauth / disassoc collector.
//
// WPA handshake capture starts with the attacker sending deauthentication
// frames to kick you off your own AP. You reconnect; they capture the
// 4-way handshake; they crack your PSK offline. 3+ disassoc events in
// a short window, without a legit driver crash, is the textbook pattern.
//
// Source: log show --predicate 'process == "wifid"' filtered client-side.
// We query the last 5 minutes on every scan — any more than that is just
// old data we've already seen, and rate limiting dedups repeat fires.

'use strict';

const { run } = require('../shell');

async function collect() {
  const res = await run(
    '/usr/bin/log',
    ['show', '--last', '5m', '--style', 'compact', '--predicate',
      'process == "wifid"'],
    { timeout: 15000, maxBuffer: 8 * 1024 * 1024 },
  );
  if (res.code !== 0) {
    return { available: false, events: [], disassocCount: 0, error: res.stderr?.trim() || res.error };
  }
  const disassocLines = [];
  const authFailLines = [];
  const roamLines = [];
  let clientDisassocs = 0;
  for (const raw of res.stdout.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    // Apple's wifid logs many spellings — match any of them
    if (/disassoc|disassociat|deauth|deauthent/.test(lower)) {
      disassocLines.push(line);
      // Count client-side disassocs (the ones that signal we were kicked)
      if (/\bclient\b|\bkicked\b|\bfrom\b.*\bap\b|\breceived\b/.test(lower)) clientDisassocs++;
      else clientDisassocs++; // be permissive — any disassoc counts
    }
    if (/auth.*fail|4-way|eapol.*fail/i.test(line)) authFailLines.push(line);
    if (/roam/i.test(line)) roamLines.push(line);
  }
  return {
    available: true,
    disassocCount: clientDisassocs,
    disassocLines: disassocLines.slice(-40),
    authFailCount: authFailLines.length,
    authFailLines: authFailLines.slice(-20),
    roamCount: roamLines.length,
    collectedAt: new Date().toISOString(),
  };
}

module.exports = { collect };
