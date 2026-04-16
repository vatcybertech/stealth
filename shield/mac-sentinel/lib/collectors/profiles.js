// Configuration Profiles collector.
//
// This is one of the highest-signal checks in the entire Sentinel.
// Configuration Profiles are Apple's MDM-grade policy mechanism. A single
// profile can grant: cert trust, VPN routing, proxy override, privacy
// permission grants, MDM enrollment, app installation. Commercial spyware
// and nation-state toolkits use them as the primary persistence mechanism
// on both iOS and macOS.
//
// ANY profile you did not install yourself is an attacker. Full stop.
//
// Sources:
//   profiles show -type configuration               (current user)
//   profiles show -type configuration -all          (system-wide, may need sudo)
//   /Library/Managed Preferences/                    (managed prefs directory)

'use strict';

const fs = require('fs');
const path = require('path');
const { run } = require('../shell');
const { sha256 } = require('../crypto');

function parseProfilesOutput(stdout) {
  const profiles = [];
  let current = null;
  for (const rawLine of stdout.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (!line.trim()) continue;
    const attrMatch = line.match(/^\s*attribute:\s*(\w+):\s*(.*)$/);
    if (attrMatch) {
      if (!current) current = {};
      current[attrMatch[1]] = attrMatch[2].trim();
      continue;
    }
    if (/There are no configuration profiles/i.test(line)) continue;
    // New profile header — the `profiles` tool prints lines like
    //   _computerlevel[1] attribute: profileIdentifier: com.example
    // or a header "System profiles installed:"
    const nextProfile = /^\w+\[\d+\]/.test(line);
    if (nextProfile && current && Object.keys(current).length) {
      profiles.push(current);
      current = null;
    }
  }
  if (current && Object.keys(current).length) profiles.push(current);
  return profiles;
}

async function collect() {
  const [userRes, allRes] = await Promise.all([
    run('/usr/bin/profiles', ['show', '-type', 'configuration'], { timeout: 8000 }),
    run('/usr/bin/profiles', ['show', '-type', 'configuration', '-all'], { timeout: 8000 }),
  ]);

  const userProfiles = parseProfilesOutput(userRes.stdout);
  const allProfiles = parseProfilesOutput(allRes.stdout);

  // Managed Preferences — if this directory is non-empty and you didn't
  // enroll in MDM yourself, something is actively managing your Mac.
  let managedPrefs = { exists: false, files: [] };
  const managedDir = '/Library/Managed Preferences';
  try {
    if (fs.existsSync(managedDir)) {
      managedPrefs.exists = true;
      const files = fs.readdirSync(managedDir);
      managedPrefs.files = files.map(f => {
        const full = path.join(managedDir, f);
        let hash = null;
        try {
          const stat = fs.statSync(full);
          if (stat.isFile()) {
            hash = sha256(fs.readFileSync(full));
          }
        } catch {}
        return { name: f, hash };
      });
    }
  } catch (err) {
    managedPrefs.error = err.message;
  }

  const userProfileCount = userProfiles.length;
  const allProfileCount = allProfiles.length;
  const noneMessageSeen = /There are no configuration profiles/i.test(userRes.stdout + allRes.stdout);

  return {
    available: userRes.code === 0 || allRes.code === 0,
    userProfiles,
    allProfiles,
    userProfileCount,
    allProfileCount,
    anyInstalled: !noneMessageSeen && (userProfileCount > 0 || allProfileCount > 0),
    managedPrefs,
    collectedAt: new Date().toISOString(),
  };
}

module.exports = { collect, parseProfilesOutput };
