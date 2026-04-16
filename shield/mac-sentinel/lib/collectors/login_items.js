// Login Items collector.
//
// macOS login items persist under two distinct systems:
//   1) The classic "Open at Login" list (shared with AppleScript/System Events)
//   2) The newer Background Items / SMAppService registry
//      (System Settings → General → Login Items & Extensions → Allow in Background)
//
// We enumerate both to the extent we can without entitlements.

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { run } = require('../shell');
const { sha256 } = require('../crypto');

async function collectClassic() {
  const script = 'tell application "System Events" to get the properties of every login item';
  const res = await run('/usr/bin/osascript', ['-e', script], { timeout: 8000 });
  if (res.code !== 0) {
    return { available: false, items: [], error: res.stderr?.trim() || res.error };
  }
  // Output is a comma-delimited list of records — we extract `name:` and `path:` pairs.
  const items = [];
  const re = /name:([^,]+),\s*path:([^,]+),\s*kind:([^,]+),\s*hidden:([^,}]+)/g;
  let m;
  while ((m = re.exec(res.stdout)) !== null) {
    items.push({
      name: m[1].trim(),
      path: m[2].trim(),
      kind: m[3].trim(),
      hidden: m[4].trim() === 'true',
    });
  }
  return { available: true, items };
}

function hashBackgroundDb() {
  // Modern Login Items live in per-user SMAppService database under
  // ~/Library/Application Support/com.apple.backgroundtaskmanagement/BackgroundItems-v*.btm
  // (sandboxed, binary). We hash the files and surface mtimes so we can
  // detect change even without parsing.
  const dir = path.join(os.homedir(), 'Library/Application Support/com.apple.backgroundtaskmanagement');
  const out = { exists: false, files: [] };
  try {
    if (!fs.existsSync(dir)) return out;
    out.exists = true;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      try {
        const stat = fs.statSync(full);
        if (stat.isFile()) {
          const buf = fs.readFileSync(full);
          out.files.push({
            name,
            size: stat.size,
            mtime: stat.mtime.toISOString(),
            hash: sha256(buf),
          });
        }
      } catch {}
    }
  } catch (err) {
    out.error = err.message;
  }
  return out;
}

async function collect() {
  const [classic, backgroundDb] = await Promise.all([
    collectClassic(),
    Promise.resolve(hashBackgroundDb()),
  ]);
  return {
    classic,
    backgroundDb,
    classicCount: classic.items?.length ?? 0,
    collectedAt: new Date().toISOString(),
  };
}

module.exports = { collect };
