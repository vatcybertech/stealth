// Installer receipts collector.
//
// macOS keeps a record of every package installed via the macOS
// Installer (.pkg files) in /Library/Receipts/InstallHistory.plist.
// An attacker who runs a malicious .pkg leaves a fingerprint here
// even if they delete the package afterward.
//
// We hash the plist bytes and record the last few entries (display
// name, date, package identifier, version) so the analyzer can
// detect new receipts appearing between scans.

'use strict';

const fs = require('fs');
const { run } = require('../shell');
const { sha256 } = require('../crypto');

const PLIST_PATH = '/Library/Receipts/InstallHistory.plist';

async function collect() {
  const out = { available: false, receipts: [], count: 0 };
  try {
    if (!fs.existsSync(PLIST_PATH)) return out;
    const stat = fs.statSync(PLIST_PATH);
    out.size = stat.size;
    out.mtime = stat.mtime.toISOString();
    const buf = fs.readFileSync(PLIST_PATH);
    out.hash = sha256(buf);
    // InstallHistory.plist is a binary plist — convert to JSON via plutil.
    const res = await run('/usr/bin/plutil', ['-convert', 'json', '-o', '-', PLIST_PATH], { timeout: 5000 });
    if (res.code === 0 && res.stdout) {
      try {
        const parsed = JSON.parse(res.stdout);
        if (Array.isArray(parsed)) {
          out.available = true;
          out.count = parsed.length;
          // Keep the 40 most recent receipts for the ledger.
          out.receipts = parsed.slice(-40).map(r => ({
            displayName: r.displayName || null,
            displayVersion: r.displayVersion || null,
            date: r.date || null,
            processName: r.processName || null,
            packageIdentifiers: r.packageIdentifiers || null,
          }));
        }
      } catch {}
    }
  } catch (err) {
    out.error = err.message;
  }
  out.collectedAt = new Date().toISOString();
  return out;
}

module.exports = { collect };
