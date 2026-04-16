# SHIELD OPSEC — don't broadcast what you're running

**The goal:** if someone is watching you in the room, on the network, or over your shoulder, nothing about your device should say *"this person is running a defense-in-depth security tool."* You want to look like a normal user who happens to be extremely well hardened.

This is operational security (OPSEC), not forensic evasion. SHIELD continues to log every event internally; we are only minimizing what is visible externally.

---

## The five things SHIELD does to minimize external signal

### 1. Zero network egress by default
The PWA never contacts any remote host. The Mac Sentinel binds to `127.0.0.1` only. No analytics, no telemetry, no CDN, no font loading, no push server that isn't Apple's own. An observer on your LAN or at your ISP sees **nothing** that distinguishes a SHIELD installation from its absence.

Check: `lsof -i :17333` on the Mac should only show `node` bound to `127.0.0.1` (or `*:17333` if you've explicitly enabled LAN binding for iPhone access).

### 2. Randomized polling cadence
The Sentinel polls every 30 seconds **plus or minus 20% jitter** (6 second window). A LAN or process observer cannot fingerprint SHIELD's timing. This also defeats the "I know that device polls exactly every 10 seconds" style of implicit identification.

Aggressive mode is 5 seconds ±20%. Same jitter applies.

### 3. No Bonjour / mDNS advertising
SHIELD does not register any `_shield._tcp` or similar mDNS service. A device scanning the local network with `dns-sd -B _services._dns-sd._udp local` will not see SHIELD listed. The Sentinel is reachable only if you know the port and fingerprint.

### 4. No distinctive process names
The Sentinel runs as plain `node sentinel.js`. `ps aux | grep node` shows a generic Node process. Nothing says "SHIELD" in the process table unless someone reads the arg vector.

### 5. Strict CORS + fingerprint pinning on the local API
The Sentinel's HTTPS server rejects requests from any origin not in its allowlist. Even if an attacker discovers the port and knows the PIN, they cannot hit the API from a different origin (e.g., a malicious browser tab on the same Mac) without being explicitly whitelisted first.

---

## Things you can do to reduce visible signal

These are user-level OPSEC moves. None of them affect SHIELD's functionality; they only change what a shoulder-surfer or someone who briefly grabs your phone can see.

### Rename the PWA's display label
The PWA installs to your home screen as "SHIELD" by default. A one-time rename in Safari's "Add to Home Screen" dialog changes it to anything you want:

1. Open the PWA URL in Safari on iPhone.
2. Tap **Share → Add to Home Screen.**
3. In the name field, replace "SHIELD" with whatever you want: `Vault`, `Notes`, `Journal`, `Mirror`, `Home`. Anything.
4. Add.

The icon is a red shield — changeable only by swapping the `icons/icon-192.svg` file before install. If you want a less-obvious icon, replace the SVG with a generic one (a gear, a notepad, a calendar square) and reinstall.

### Rename the Shortcuts
You do not have to name the four iOS Shortcuts literally `SHIELD Kill Switch` etc. You can call them `KS`, `Night`, `AM`, `Snap` or anything else — but **the PWA looks them up by the exact name**. If you rename, update the PWA's `js/shortcuts.js` file to match (or, better, wait for the configurable-shortcut-name update on the TODO list).

Alternative: keep the Shortcut names internal (stored in the Shortcuts app) but change the **display label** on the home screen icons. When you add a Shortcut to the home screen, iOS lets you give it a different title. So internally it is `SHIELD Kill Switch`, on your home screen it shows as `Panic` or `X` or nothing at all (just the icon).

### Generic push notification title
Set **Settings → Notifications → SHIELD → Show Previews → Never** on iPhone. The lock screen will show "SHIELD" as the app name but no content. Combined with renaming the PWA during installation, the lock-screen notification reads "`<your chosen name>` — Notification" with no detail.

In a future update (and in `CLAUDE.md` as a TODO) the push payload from the service worker can be set to a generic title like "Update" with content only visible after unlock.

### Disable notification previews globally
**Settings → Notifications → Show Previews → When Unlocked.** Belt and suspenders. Nobody sees the content of any notification on your lock screen, period.

### Use Focus modes to blend in
Set up a Focus mode called whatever you want (`Work`, `Personal`, `Default`) and have SHIELD notifications come through in that mode. Without the Focus context, the notifications look like any other app notification.

### Don't tap the Kill Switch in public
The FAB is a bright red button that says `KILL`. Tapping it in a meeting is visible. For public use:
- Set up the **Back Tap** accessibility feature (Settings → Accessibility → Touch → Back Tap → Double Tap / Triple Tap → Run Shortcut → SHIELD Kill Switch). Triple-tapping the back of your phone runs the shortcut silently. Nobody watching your screen sees anything.
- Or assign the Kill Switch Shortcut to the **Action Button** (if your iPhone has one).
- Or add the Shortcut to **Control Center** via Settings → Control Center → Shortcuts.

### Local backup only, no iCloud backup of SHIELD
SHIELD's IndexedDB is **not** backed up to iCloud by default (PWAs' storage lives in WebKit's local container, which is not part of iCloud backup). But if you enable Safari iCloud sync, some PWA-adjacent data may sync. Keep **Settings → [Name] → iCloud → Safari → Off** and **Settings → [Name] → iCloud → Sync Across Safari → Off** unless you specifically want cross-device Safari state. SHIELD's encrypted state stays on-device.

### Don't discuss SHIELD publicly
The single biggest OPSEC loss is telling someone you have a tool that detects X, Y, and Z. An adversary who knows what you're watching for adjusts. Keep SHIELD private. This includes:
- Not mentioning it in public GitHub repos.
- Not tweeting about it.
- Not bringing it up in Slack DMs unless they're end-to-end encrypted.
- Not discussing specific events it has flagged except with a trusted investigator.

---

## What IS visible even with all of the above

Complete invisibility is impossible. Things an attentive observer can still see:

- **Apple ID hardening posture.** If they compromise your Apple ID account, they can see that you have Lockdown Mode on, Advanced Data Protection on, and hardware keys registered. That's fine — those are supposed to be visible; they're the first line of defense and they intimidate attackers in a useful way.
- **Your device's behavior under attack.** If they send a malicious iMessage, FaceTime call, or attachment, they can see that their attack didn't work. They learn you have Lockdown Mode or similar. This is unavoidable.
- **Your MacBook running a LaunchAgent on port 17333.** If they have code execution on your Mac, they can see `com.shield.sentinel` in your LaunchAgents directory. Mitigation: rename the LaunchAgent label in `install.sh` to something plausible (e.g., `com.apple.system.updater` — but be cautious, as actively impersonating Apple can confuse legitimate processes). The current default uses `com.shield.sentinel`, which is honest but identifying.
- **Your network's size, shape, and baseline.** A long-running observer on your LAN learns which devices are usually there. SHIELD doesn't hide this — SHIELD *uses* this via its whitelist system.

---

## Renaming the LaunchAgent (advanced OPSEC)

If you want the Sentinel's LaunchAgent to be non-identifying, edit `install.sh` **before** running it:

1. Open `shield/mac-sentinel/install.sh` in a text editor.
2. Find every occurrence of `com.shield.sentinel` and replace with your chosen label. Pick something boring and unlikely to be inspected — `com.<yourname>.backup`, `com.local.maintenance`, etc. **Do not** impersonate Apple or a real vendor — that can break other software.
3. Find the `Label` key in the plist template and update it to match.
4. Find the keychain service name (`KEYCHAIN_SERVICE`) and update it to match.
5. Save, then run `bash install.sh` normally.

The Sentinel behavior is identical; only the label has changed. If you later reinstall or uninstall, use the same label in the commands.

---

## The "don't look like you're running a security thing while walking around" mode

TL;DR — the combination that gets you closest to unidentifiable:

1. Rename the PWA display label during installation (`Home` or `Notes`).
2. Replace `icons/icon-192.svg` with a generic icon before installing.
3. Never show notification content on the lock screen.
4. Run the Kill Switch from Back Tap, not from the visible red FAB.
5. Rename the LaunchAgent label in `install.sh`.
6. Run a personal VPN (see `VPN_GUIDANCE.md`) so SHIELD's internal traffic is lost inside general encrypted traffic.
7. Don't say the word "SHIELD" out loud when you're near someone you don't fully trust.

With that setup, what an outside observer sees is: a person with a hardened iPhone (Lockdown Mode is visible via behavior, not via a label), a Mac running a backup agent, and a home screen icon labeled `Notes`. Nothing unusual. Nothing that says "this person is watching."

---

## A note about the "scare them off" idea

The original prompt asked whether SHIELD should "scare" an attacker via visible architecture. OPSEC points the opposite direction: the best deterrent is **invisibility plus capability**. If they cannot tell what you are running, they cannot build a bypass for it. They can only test, get caught, and move on. That is, in practice, the same outcome as being scared off, and it comes with the additional benefit that you learn more about them (via SHIELD's logs) before they realize you're watching.

The visible hardening — Lockdown Mode, security keys, Advanced Data Protection, no installed Configuration Profiles, no cloud footprint — is already more intimidating to a capable attacker than any custom software. That's what they check first. If they see all of that and then also hit a brick wall on a half-dozen other low-visibility detections, they will back off.
