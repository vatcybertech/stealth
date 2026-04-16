// Clipboard exfiltration detection.
//
// Privacy-preserving: we NEVER store clipboard contents. We only hash
// them, and we cross-reference clipboard changes with foreground-app
// changes. A clipboard change without a foreground-app context change
// is unusual — legitimate software almost always changes the
// clipboard as a result of a user action, which also changes the
// frontmost app.
//
// This is also a TCC-friendly approach: pbpaste on modern macOS
// requires clipboard access entitlement. We try it; if it fails, we
// return available:false and the analyzer treats this collector as
// inactive. No nagging prompts because we only call pbpaste once per
// scan and handle the failure silently.
//
// Note: pbpaste reading triggers a system "used clipboard" indicator
// on modern macOS. Enable this collector only after granting the
// Sentinel's node process clipboard access in System Settings →
// Privacy & Security → (whatever the pasteboard bucket is).

'use strict';

const crypto = require('crypto');
const { run } = require('../shell');

async function getFrontmostApp() {
  const res = await run('/usr/bin/osascript', ['-e',
    'tell application "System Events" to get name of first application process whose frontmost is true'],
    { timeout: 3500 });
  if (res.code !== 0) return null;
  return res.stdout.trim() || null;
}

async function getClipboardHash() {
  // -Prefer utf8; fall back silently on any error
  const res = await run('/usr/bin/pbpaste', ['-Prefer', 'txt'], { timeout: 3500 });
  if (res.code !== 0) return { available: false, error: res.stderr?.trim() || res.error };
  const buf = Buffer.from(res.stdout || '', 'utf8');
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  return { available: true, hash, len: buf.length };
}

async function collect() {
  const [clip, frontmost] = await Promise.all([getClipboardHash(), getFrontmostApp()]);
  return {
    available: clip.available,
    hash: clip.hash || null,
    length: clip.len ?? 0,
    frontmost: frontmost || null,
    error: clip.error || null,
    collectedAt: new Date().toISOString(),
  };
}

module.exports = { collect };
