# MacBook — Maximum Lockdown

Every setting, in order. Do every step. Built for someone who knows the attacker has had full access at one point. The goal: every channel disabled by default, every privilege scoped, every persistence location auditable.

If you can run `shield/audit.sh` (see that script), do it before and after — it dumps the state we're hardening.

---

## Phase 0 — Before you start

- [ ] Plug into power. This will take a couple hours.
- [ ] Disconnect from network for the destructive parts (you can re-enable for App Store / Apple ID).
- [ ] If you have any unsaved/important data not in iCloud or Time Machine, back it up to an encrypted external drive **first**.

## Phase 1 — Decide: clean reinstall, or harden in place

**Strongly preferred: clean reinstall.** Hold ⌘+R at boot, Disk Utility → erase the entire internal drive (APFS), reinstall macOS from Recovery. Set up as a new Mac, do not restore from Time Machine, do not restore Migration Assistant from another Mac you suspect.

If you can't reinstall, harden in place — every step below still applies, but understand persistence may survive.

## Phase 2 — Firmware / boot

- [ ] Apple Silicon (M-series): the recovery system enforces secure boot. Verify in Recovery → Startup Security Utility → **Full Security**.
- [ ] **Set a firmware password** if Intel. (Apple Silicon doesn't have one in the same form, but secure boot replaces most of its purpose.)
- [ ] Verify Recovery itself is intact: in Recovery, Startup Security Utility loads and shows expected options.

## Phase 3 — Account setup

- [ ] First user account: this becomes your **standard user** account, NOT admin. Skip — actually, the first account must be admin on macOS. Workaround:
  1. Create the first account as admin (call it `setup`, give it a long random password you store in your password manager).
  2. Create a second standard user account for daily use (call it your name).
  3. Log in as your name; verify all subsequent app installs prompt for the `setup` admin password.
  4. Use `setup` only when installing or updating software. Day-to-day = standard user.

This single change blocks most malware that requires admin escalation to persist.

- [ ] Apple ID: sign in with the rotated Apple ID. Use ADP (Advanced Data Protection) — Settings → [Name] → iCloud → ADP → On.
- [ ] Add the same two YubiKeys you added on the iPhone.

## Phase 4 — FileVault + Find My

- [ ] System Settings → Privacy & Security → FileVault → **Turn On**. Store the recovery key locally (in your password manager) — NOT in iCloud.
- [ ] System Settings → [Name] → Find My → Find My Mac → On. Find My Network → On.

## Phase 5 — Lockdown Mode

- [ ] System Settings → Privacy & Security → Lockdown Mode → **Turn On**. Reboot.

Same effect as on iPhone — disables risky parsers and exotic features. Some web fonts and message attachments will look broken; that's the point.

## Phase 6 — Sharing (turn off everything)

System Settings → General → Sharing. Every toggle should be **Off** unless you have a daily, current reason for it:

- [ ] Screen Sharing — Off
- [ ] File Sharing — Off
- [ ] Media Sharing — Off
- [ ] Printer Sharing — Off
- [ ] Remote Login (SSH) — **Off** (this is a top stalker vector)
- [ ] Remote Management (ARD) — **Off** (this is the #1 stalker vector — Apple Remote Desktop control)
- [ ] Remote Apple Events — Off
- [ ] Internet Sharing — Off
- [ ] Bluetooth Sharing — Off
- [ ] Content Caching — Off
- [ ] AirPlay Receiver — **Off**
- [ ] Allow remote administration — Off

## Phase 7 — Network

- [ ] System Settings → Network → Firewall → **Turn On**. Options → Block all incoming connections (start strict, loosen only if something legit breaks). Enable Stealth Mode.
- [ ] Wi-Fi → forget every network you don't actively use. (i) on each → "Auto-Join" off if it's a network you control but don't always want.
- [ ] Wi-Fi → "Ask to join networks" → On. "Ask to join hotspots" → On.
- [ ] DNS: Network → your active interface → Details → DNS → set to `1.1.1.2` / `1.0.0.2` (Cloudflare malware-blocking) or your DoH/DoT provider via a configuration profile.
- [ ] Bluetooth — Off when not actively in use. Audit paired devices and forget anything you don't currently use.
- [ ] Wired Ethernet preferred over Wi-Fi when at home. Wired is harder to attack from the parking lot.

## Phase 8 — Privacy & Security (audit every category)

System Settings → Privacy & Security. Walk every category. Default deny.

- [ ] **Full Disk Access** — strip every app you don't recognize. This is the most dangerous permission on macOS — grants read access to everything including Mail, Messages, Safari history, Time Machine, every other app's data.
- [ ] **Accessibility** — same. Apps with Accessibility can simulate keyboard and mouse — full UI control.
- [ ] **Input Monitoring** — same. Apps here see every keystroke. Should be empty for most users.
- [ ] **Screen Recording** — same. Apps here can screenshot/record continuously.
- [ ] **Automation** — apps that can drive other apps via AppleScript. Audit per-app.
- [ ] Camera, Microphone, Bluetooth, Location Services, Contacts, Calendars, Reminders, Photos, Files & Folders → audit each.
- [ ] Analytics & Improvements → Share Mac Analytics → Off, Share iCloud Analytics → Off, Improve Siri & Dictation → Off.
- [ ] Apple Advertising → Off.

## Phase 9 — Login items + LaunchAgents/Daemons (persistence)

- [ ] System Settings → General → Login Items → **delete every entry you don't recognize**. Both "Open at Login" and "Allow in the Background" tabs.
- [ ] Open Terminal. Run:
  ```
  ls -la ~/Library/LaunchAgents
  ls -la /Library/LaunchAgents
  ls -la /Library/LaunchDaemons
  ```
- [ ] For each unknown plist, run `cat <path>` and `launchctl print gui/$(id -u)/<label>`. Anything you don't recognize → move to a quarantine folder, then `launchctl bootout`. (See `INCIDENT_RESPONSE.md` for safe quarantine.)

## Phase 10 — Profiles, MDM, sudoers, hosts

- [ ] System Settings → Privacy & Security → Profiles → **delete every profile**. If "Profiles" doesn't appear at all, you have none — good. If it appears and shows enrollment you didn't authorize → that's MDM compromise → factory reinstall is required.
- [ ] Terminal: `sudo ls -la /etc/sudoers.d/` → audit. Only `shield` (if you installed it) should be there.
- [ ] Terminal: `sudo cat /etc/sudoers` → look for any non-default rules.
- [ ] Terminal: `cat /etc/hosts` → should contain only loopback. Anything pointing your bank/email/etc. to a custom IP is hostile.

## Phase 11 — Software policy

- [ ] System Settings → Privacy & Security → Allow apps from → **App Store**. Not "App Store and identified developers." This is the strictest setting; loosen only when installing a specific notarized app you trust.
- [ ] Gatekeeper: `spctl --status` → should say "assessments enabled." If not: `sudo spctl --master-enable`.
- [ ] System Integrity Protection: `csrutil status` → should say "enabled." If not, you have a serious problem — boot to Recovery and `csrutil enable`.
- [ ] Disable Spotlight indexing of external drives if you handle untrusted media.

## Phase 12 — Browser

Choose one browser for sensitive use. Recommendation: **Safari** (Lockdown-aware) or **Firefox** (with Arkenfox user.js).

- [ ] Safari → Settings → Privacy → Prevent cross-site tracking on, Hide IP address from trackers and websites on, Advanced → block all cookies (then exception-list the few sites you need).
- [ ] Safari → Extensions → remove every extension. Add back only audited ones.
- [ ] Safari → Privacy → Manage Website Data → Remove All.
- [ ] Use a separate browser (Brave, Tor) for casual browsing. Never log in to anything sensitive on the casual browser.

## Phase 13 — Mail / Messages

- [ ] Mail → Settings → Privacy → Protect Mail Activity → On.
- [ ] Mail → Settings → Accounts → audit. Each account → look at Mailbox Behaviors → Junk → ensure no auto-delete rules you didn't set.
- [ ] **Mail → Settings → Rules → delete every rule you didn't create.** This is the #1 hiding place for "auto-forward to attacker."
- [ ] Messages → Preferences → iMessage → consider Sign Out (number-tied; you said number is the foothold). Use Signal instead.
- [ ] FaceTime → consider Sign Out.

## Phase 14 — Time Machine + backups

- [ ] System Settings → General → Time Machine → backup to a wired external SSD (not network/iCloud). Encrypt backup. Set the disk's password in your password manager.
- [ ] Disconnect the backup disk between backups. A connected backup that gets ransomwared/wiped is no backup.
- [ ] Test a restore quarterly to a spare machine.

## Phase 15 — Accessibility (the attack surface)

System Settings → Accessibility. Same logic as iPhone — disable every accessibility feature you don't actively use; each one is a remote-control surface for an app with the right permission.

- [ ] Voice Control → Off.
- [ ] Switch Control → Off.
- [ ] Spoken Content → Off unless used.
- [ ] Hover Text → Off.
- [ ] Audio → Background Sounds → Off.
- [ ] Keyboard → Sticky Keys, Slow Keys, Mouse Keys → Off unless used.

## Phase 16 — Input devices

- [ ] System Settings → Keyboard → Input Sources → remove every keyboard layout you don't use. (Malicious layouts can re-map keys to inject text.)
- [ ] Trackpad / Mouse → audit gestures; nothing here is dangerous, but remove anything that triggers Mission Control or Hot Corners pointing to apps you don't use.

## Phase 17 — SHIELD Mac Sentinel

- [ ] Install Mac Sentinel per `DEPLOY.md`.
- [ ] Install the sudoers rules per `install-sudoers.sh` (review every line first).
- [ ] Set up the PWA on iPhone and Mac per `DEPLOY.md`.
- [ ] Configure auto-response per `ENFORCEMENT.md`. Set `gracePeriodSeconds` to 86400 or less while you're actively under attack.
- [ ] Run `shield/audit.sh` weekly.

## Phase 18 — Physical

- [ ] Camera cover (sticker or built-in slider).
- [ ] Microphone: T2 / Apple Silicon Macs hardware-disconnect the mic when the lid is closed and Mac is in clamshell — verify this is your config. For full mic kill: System Settings → Privacy & Security → Microphone → revoke all apps.
- [ ] Lock screen on lid close, immediate password require. System Settings → Lock Screen → Require Password → Immediately.
- [ ] Don't leave the laptop unattended. Use the lid as an authenticator: lid-down = locked, no-one-touches.

---

## After every reboot, every login

- Confirm Wi-Fi joined the right network (not an evil twin with the same SSID).
- Confirm Bluetooth is off.
- Confirm Sharing services are still off (System Settings → General → Sharing).
- Confirm no new login items appeared.
- Confirm SHIELD Sentinel is running (`launchctl list | grep shield`).

If anything changed without your action, that's an event. Document and treat as compromise per `INCIDENT_RESPONSE.md`.
