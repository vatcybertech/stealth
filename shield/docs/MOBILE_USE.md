# SHIELD on the go — using SHIELD when you're not at the Mac

**The honest setup.** SHIELD is a two-tier system. The Mac Sentinel does the real detection; the PWA is the interface. When you are driving, working outside the house, at the gym, on a plane, or otherwise not on the same network as the Mac, the live link is not available. You should not be surprised by this — it is a direct consequence of zero cloud, zero external infrastructure, and it is the right trade.

This document explains what SHIELD *can* do for you when you are mobile, what it *cannot*, and the workflow that covers the gap without compromising the architecture.

---

## What still works off-network

The PWA is offline-first. Every feature below works with zero internet, zero connection to the Mac, cellular-only, airplane mode, anything:

1. **The encrypted journal.** Write an entry with a photo attachment. It is stored encrypted on the phone. When you're back on the home network, a background sync pushes its hashes to the Mac Sentinel ledger to cohere the two chains.
2. **The hardening checklist.** All 60+ items, offline, with per-item timestamped completion stored in the tamper-evident journal.
3. **The kill switch.** Tapping the red FAB fires the iOS `SHIELD Kill Switch` Shortcut which toggles Airplane Mode, Wi-Fi, Bluetooth, and Do Not Disturb — fully local, no Sentinel required.
4. **Night Mode / Morning Check / Log Snapshot Shortcuts.** Bedtime automations run regardless of network state.
5. **Evidence export.** Signed JSON + printable HTML report of whatever SHIELD has in its local journal. Works offline — it only exports what is already on the phone.
6. **The last-known Sentinel posture.** New in v1.3: when you're on the home network, the PWA encrypts and caches the latest Sentinel status to IndexedDB. When you leave the network and open the PWA, the dashboard shows that last-known posture with a "Last sync: N minutes/hours ago" indicator.
7. **Auto-lock, PIN re-entry, 10-wrong-PIN wipe.** All local.
8. **The honest capabilities table, the hardening runbook, the incident response runbook.** Bundled with the app.

---

## What does NOT work off-network

1. **Real-time Sentinel alerts.** If the Mac fires a CRITICAL event while you're driving, you will not see it on the phone until you are back on the home network and the PWA polls. This is a hard limit of not having a cloud relay.
2. **Fresh LAN / Bluetooth / process data from the Mac.** Stale by the age shown in the "Last sync" indicator.
3. **On-device iPhone scanning.** The PWA cannot see iOS internals (profiles, keyboards, Bluetooth, background processes). That is an iOS / Safari restriction, not a SHIELD limitation. See [`CAPABILITIES.md`](CAPABILITIES.md).

---

## The sync freshness indicator

In v1.3, the dashboard status card shows a small dot with a label:

| Color  | Meaning                                   | State in your life     |
|--------|-------------------------------------------|------------------------|
| Green (glow) | **LIVE** — synced within the last 30 seconds | You are on the home network right now, connected to the Sentinel. |
| Green  | Last sync < 5 minutes                     | You just left the network, or you're on it but the current poll hasn't come in yet. |
| Yellow | Last sync 5 minutes to 1 hour             | You're off-network. Data is still current enough to trust for posture. |
| Orange | Last sync 1 to 6 hours                    | You've been gone a while. Treat the posture as historical. |
| Red    | Last sync > 6 hours                       | Significantly stale. You need to check the Mac when you get home. |
| Muted  | Never synced / Sentinel not paired        | Pair the Sentinel in Settings. |

**Important:** the sync indicator is about the LINK to the Sentinel. It is NOT a threat level. The threat dot in the top bar is the threat level. A green threat dot with a yellow sync indicator means: "the last time we heard from the Mac, everything was fine, and that was 10 minutes ago."

---

## The mobile workflow

When you leave the house:

1. **Open SHIELD briefly before you leave.** Tap the dashboard to force a fresh poll from the Mac Sentinel. This ensures the cache is up to date and your offline view starts green.
2. **Set up the hourly Shortcut automation** described below. This is the closest thing to continuous passive iPhone observation that is possible in a PWA-bound stack.
3. **If something feels wrong while mobile:**
   - **Do not tap the Kill Switch in public unless you are genuinely compromised right now.** The FAB is visible and tapping it in a meeting is social noise. Use the Back Tap panic button (Settings → Accessibility → Touch → Back Tap → Triple Tap → Run Shortcut → SHIELD Kill Switch). Three taps on the back of your phone, silent, no one sees it.
   - **Write a journal entry describing exactly what you observed.** Timestamped, photo-attached if useful. The journal is the single most valuable artifact you can produce for yourself.
   - **If you suspect physical proximity:** leave. Go somewhere else. The attacker's advantage in proximity attacks is that you stay in range.
   - **Check back with the Mac when you get home.** If anything happened on the Mac side, SHIELD's hourly scan will catch it and you'll see the event when you re-sync.
4. **When you get home:** open the PWA, let it re-sync, review any events that fired while you were away. The dot should go back to LIVE within 10 seconds of joining the home Wi-Fi.

---

## SHIELD Hourly Check — the mobile passive observer

The PWA cannot run background tasks on iOS. The closest thing we can do is an iOS Shortcut automation that runs on a schedule (iOS Automation → Time of Day → Hourly → Run Shortcut) and writes phone-side state to a Notes note for later review.

### Building the Shortcut

1. **Open the Shortcuts app → Shortcuts → + to create new.**
2. Rename to exactly: `SHIELD Hourly Check` (or any name you prefer — but update `js/shortcuts.js` to match).
3. Add these actions in order:

   a. **Get Current Date.** Output variable: `Now`.

   b. **Get Battery Level.** Output variable: `Battery`.

   c. **Get Network Details → Network Name (SSID).** Output variable: `SSID`.

   d. **Get Network Details → BSSID** (if available on your iOS version). Output: `BSSID`.

   e. **Get Focus (if available in your version).** Output: `Focus`.

   f. **Get Device Details → Device Model.** Output: `Model`.

   g. **Text action:**
      ```
      SHIELD hourly check
      time:    [Now]
      model:   [Model]
      ssid:    [SSID]
      bssid:   [BSSID]
      battery: [Battery]%
      focus:   [Focus]
      ```

   h. **Append to Note.** Choose or create a Note titled `SHIELD Log` in the Notes app. **Do not share this note to iCloud if you are worried about iCloud.** Use a Local-only note (On My iPhone).

4. **Tap Done.**
5. **Tap the share icon → Add to Home Screen** if you want a manual trigger button. Otherwise run it from Automation only.

### Setting up the automation

1. **Shortcuts → Automation tab → + → Create Personal Automation.**
2. **Time of Day → custom → set to any 5-minute offset from the hour** (e.g., 10:05, 11:05, 12:05 … — offsetting prevents the automation from clustering with every other hour-top task).
3. Repeat: **Hourly**.
4. **Ask Before Running: OFF.** (So it actually runs in the background.)
5. **Notify When Run: OFF** (unless you want the notification for testing).
6. **Next → Run Shortcut → SHIELD Hourly Check → Done.**

Now every hour, the iPhone appends a fresh snapshot to the SHIELD Log note, passive and automatic.

### Reviewing the log

Two options:

- **Manual review.** Open the Notes app, scroll the `SHIELD Log` note, look for anomalies: unexpected SSID changes (left home Wi-Fi and showed up on an unexpected network), BSSID drift on your home SSID (evil twin), sudden Focus changes you didn't initiate, rapid battery drain between entries (suspicious background activity).
- **PWA import.** In the SHIELD PWA, open **Journal → New entry**, copy the relevant lines from the SHIELD Log note, paste into the journal text field with severity = INFO or whatever you think matches, save. The entry becomes part of the tamper-evident hash chain.

---

## What to do if the Mac goes unreachable while you're away

Healthy "Sentinel offline" conditions:

- You're not on the home network. (Expected. Yellow/orange dot.)
- Home power went out.
- Mac went to sleep with the lid closed.
- Mac rebooted for a macOS update and is still in the login screen.

Unhealthy "Sentinel offline" conditions (reasons to be concerned):

- You ARE on the home network but the dot won't turn green.
- Mac is on and you can screen-share / SSH into it, but SHIELD's HTTPS endpoint is not responding.
- SHIELD Sentinel process is not visible in `ps aux`.
- `~/Library/Application Support/SHIELD/sentinel.err` shows a fresh error.

If you see the second category, the investigation runbook is:

1. Write a journal entry: "Sentinel link dead as of [time]."
2. From the Mac: `launchctl list | grep com.shield.sentinel`. If it's not there, the LaunchAgent was unloaded — check your ledger for the last APP_LOCK event and see what timestamped it.
3. Check `sentinel.err` for a SELF_INTEGRITY_FAIL entry. If present, the source files have been modified and the Sentinel refused to start. That is itself a CRITICAL event and you should go to [`INCIDENT_RESPONSE.md`](INCIDENT_RESPONSE.md) Step 0 immediately.
4. Check the heartbeat file: `cat ~/Library/Application\ Support/SHIELD/heartbeat.json`. It tells you the last time the Sentinel successfully ticked.
5. Check the ledger for any `LEDGER_TAMPER` entries: if the PWA and Mac are in agreement the ledger was tampered with, export both and treat as evidence.

---

## Push notifications (iOS 16.4+) — the half-working option

If your iPhone is on iOS 16.4 or later and the SHIELD PWA is installed to the Home Screen, the PWA is **eligible** for web push notifications. This could in principle give you real-time Mac Sentinel alerts on the phone regardless of network, because Apple Push Notification Service routes around local network state.

The catch: web push requires the push payload to originate from a server with a VAPID key pair, which SHIELD does not have and will not add, because it would introduce a cloud component that violates the zero-egress principle. An intermediate relay owned by you (e.g., a cheap VPS running your own VAPID-signing bridge that only your Mac Sentinel talks to) would work, but it moves SHIELD from "zero-trust, zero-egress" to "trust yourself to operate a relay correctly."

**Recommendation:** do not do this unless you are a professional who will set it up correctly and audit it regularly. The mobile caching + hourly Shortcut log is the correct answer for most users.

---

## If you are considering running SHIELD Sentinel on an iPad or second Mac as a portable monitor

Worth thinking about:

- **Second Mac (a MacBook you take with you):** install SHIELD on it. It now monitors itself while you're away. You get all of Lockdown Mode, FileVault, firewall, profiles, launch agents, the full posture on the device you're actively using. This is the real upgrade path if you spend a lot of time away from the primary Mac and can justify the hardware.
- **iPad:** not supported. SHIELD's Mac Sentinel uses macOS-specific command-line tools (`arp`, `airport`, `profiles`, `codesign`, `system_profiler`, `log show`) that do not exist on iPadOS. An iPad running the SHIELD PWA is useful as a dashboard viewer but cannot run the Sentinel itself.
- **Linux:** the Sentinel is explicitly macOS-only by design. Porting it to Linux is possible but out of scope.

---

## Bottom line

Off-network, the phone is a journal, a checklist, a kill-switch bridge, and a viewer for the last-known Mac Sentinel posture. Those four things cover most real-world mobile needs for a defensive-security tool. The gap — sub-second live detection of something happening at home while you're away — is a real gap, and the correct answer to it is either a second Mac you carry with you or a manual check-in when you get back. Anything else introduces a cloud component that becomes an attack surface of its own.

Configure the Hourly Check Shortcut, trust the cached posture, don't panic if the dot goes yellow while you're driving, and review the SHIELD Log note on a weekly basis when you're sitting down with the PWA anyway.
