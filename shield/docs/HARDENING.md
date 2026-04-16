# SHIELD Hardening Runbook

**Do every step in this file before you trust SHIELD to watch over anything.** These are the actual locks. SHIELD is the alarm system. An alarm on an unlocked door is theater.

Work in order. Check off each step in the PWA's Hardening Checklist as you complete it — SHIELD will store a tamper-evident record of the completion timestamp.

---

## Phase 0 — From a known-clean device (before touching your own)

If you have any reason to believe your iPhone or Mac is currently compromised, do these from a *different* device — a library computer, a trusted friend's laptop, a brand-new phone. Not yours.

1. Sign in to [appleid.apple.com](https://appleid.apple.com).
2. **Change your Apple ID password.** Use a new 16+ character password, not a variant of an old one. Store it in a password manager.
3. Under **Devices**, review every listed device. Sign out of anything you don't recognize. Sign out of everything if you're not sure.
4. Under **Account Security → Trusted Phone Numbers**, remove any number you don't actively control.
5. Under **Family Sharing**, review members. Remove anyone unexpected. If the family organizer is not you and shouldn't be, leave the family.
6. Turn on **Advanced Data Protection** (you may need to do this later from your own device; some iCloud data types require ADP to be enabled from a trusted device).
7. Review **App-Specific Passwords** and revoke anything you didn't create.

---

## Phase 1 — iPhone hardening (do on the iPhone itself)

1. **Update to the latest iOS.** Settings → General → Software Update.
2. **Settings → Privacy & Security → Lockdown Mode → Turn On → Turn On & Restart.** This is the single highest-impact step. It disables the majority of the attack surface used by real-world iOS exploits: complex web JIT, attachment auto-parsing, FaceTime from unknown callers, configuration profile installation, wired accessory access while locked, and a dozen other things. Accept the tradeoffs (some websites will be slower, some attachments may not render, AirDrop is limited). The tradeoffs are worth it.
3. **Settings → Face ID & Passcode → Stolen Device Protection → On.** Requires biometric auth (no passcode fallback) for security-sensitive actions, and enforces a one-hour delay before changes when away from familiar locations.
4. **Settings → General → VPN & Device Management.** If you see *anything* listed here that you did not personally install, that is your attacker. Delete it. Take a screenshot first (for your journal).
5. **Settings → General → AirDrop → Receiving Off** (or Contacts Only if you really need it).
6. **Settings → Bluetooth → Off** unless actively in use.
7. **Settings → Privacy & Security → Analytics & Improvements → Share iPhone Analytics → Off.**
8. **Settings → [Your Name] → Family Sharing.** Leave the family if it isn't yours. Do not rejoin.
9. **Settings → [Your Name] → Find My → Share My Location → Off** (unless you have a specific reason). Review who it's shared with.
10. **Settings → [Your Name] → iCloud → Advanced Data Protection → Turn On.** This end-to-end encrypts nearly all iCloud data so that even Apple cannot read it.
11. **Settings → [Your Name] → Sign-In & Security → Security Keys → Add Security Key.** Use a YubiKey 5C NFC. Register two keys (one primary, one backup, stored separately).
12. **Settings → Messages → iMessage Contact Key Verification → Turn On.**
13. **Settings → Safari → Privacy & Security → Advanced → Block All Cookies** (or just Prevent Cross-Site Tracking if that's too aggressive for daily use).
14. **Settings → Safari → Extensions.** Remove anything you don't recognize.
15. **Settings → General → Keyboard → Keyboards.** Remove any third-party keyboard you did not install yourself. A malicious keyboard can see everything you type.

### iPhone: the nuclear option (DFU restore)
If Lockdown Mode is not enough to make you sleep, or if you see any evidence of persistent compromise (unknown profiles, weird cellular usage, battery drain, SMS you didn't send):

1. Back up photos and contacts to a trusted location (not iCloud, if iCloud may be compromised — use a direct Mac cable backup).
2. Buy a new Lightning/USB-C cable and use a known-clean Mac.
3. Put the iPhone in DFU mode (Apple's instructions vary by model — look up the exact button sequence for your model).
4. Restore via Finder. **Do not restore from backup.** Set up as new.
5. Sign in with your newly-rotated Apple ID.
6. Redo every step above from scratch.

---

## Phase 2 — MacBook hardening

1. **System Settings → General → Software Update** — install the latest macOS.
2. **System Settings → Privacy & Security → Lockdown Mode → Turn On.**
3. **System Settings → Privacy & Security → FileVault → Turn On.** Store the recovery key somewhere physically safe (a safe deposit box, fireproof safe, or trusted family member). **Not** in iCloud if you're worried about iCloud.
4. **System Settings → Privacy & Security → Firewall → On.** Click Options. **Enable stealth mode. Block all incoming connections** unless you explicitly need one open.
5. **System Settings → Privacy & Security → Gatekeeper** — confirm "App Store and identified developers" is set.
6. **System Settings → General → Sharing.** Turn OFF everything: Screen Sharing, File Sharing, Media Sharing, Remote Login, Remote Management, Remote Apple Events, Printer Sharing, Bluetooth Sharing, Content Caching, AirPlay Receiver, Internet Sharing. All off. Only turn one on when you actively need it, and turn it back off after.
7. **System Settings → General → Login Items & Extensions.** Review "Open at Login" and "Allow in Background" — disable anything you don't recognize.
8. **System Settings → Privacy & Security → Profiles.** If this section exists, review every profile. Anything you didn't install yourself is an attacker foothold. Delete it.
9. **System Settings → Privacy & Security → Full Disk Access / Accessibility / Input Monitoring / Screen Recording / Automation.** Review every app with these permissions. Remove anything you don't recognize or don't use anymore. These are the most valuable permissions an attacker can have.
10. **Terminal:** run
    ```
    sudo spctl --status          # should say: assessments enabled
    csrutil status               # should say: System Integrity Protection status: enabled
    fdesetup status              # should say: FileVault is On.
    sudo socketfilterfw --getglobalstate   # should say: Firewall is enabled
    ```
    SHIELD's Mac Sentinel checks all of these on every scan. Fix any that are wrong.
11. **Change your Mac login password** to a long passphrase. Do not reuse your Apple ID password.
12. **Safari → Preferences → Extensions.** Remove anything unfamiliar.
13. **Check Login Items and LaunchAgents manually one time:**
    ```
    ls -la ~/Library/LaunchAgents/
    ls -la /Library/LaunchAgents/
    ls -la /Library/LaunchDaemons/
    ```
    Anything in there you don't recognize — Google it. If you can't confirm it's benign, it's not.

### Mac: the nuclear option
If you are not confident the Mac is clean:

1. Back up *documents only* to an external drive (not applications, not Library — data only).
2. **Apple Menu → System Settings → General → Transfer or Reset → Erase All Content and Settings.** This is Apple's secure wipe for Apple Silicon and T2 Macs.
3. Set up as new, do not migrate.
4. Redo every step above.

---

## Phase 3 — Network hardening

1. **Log in to your router's admin page.**
   - Change the admin password (not the Wi-Fi password — the admin login). Use a long passphrase.
   - Update firmware. Check the manufacturer's site directly; don't trust the router's own update button alone.
   - Disable WPS.
   - Disable UPnP.
   - Disable remote/WAN admin access.
   - Set Wi-Fi to WPA3 (or WPA2-AES if WPA3 isn't supported — never WEP, never WPA mixed mode).
   - Change the Wi-Fi password to a new long passphrase.
2. **Check the connected device list** in the router admin. Write down every MAC. SHIELD's Mac Sentinel will warn you about new ones later — this list is your ground truth.
3. **Turn off the router's guest network** unless you actively use it. If you keep it, make sure it's isolated from the main network.
4. **Consider a separate IoT VLAN** if your router supports it, for smart-home devices. Cameras, smart plugs, and cheap IoT are the most commonly compromised devices on a home network.
5. **Consider changing your router's DNS** to a privacy-respecting resolver like Quad9 (9.9.9.9) or Cloudflare (1.1.1.1).
6. **If the router is ISP-supplied,** factory reset it as well. Many ISP routers ship with default passwords or known backdoors.

---

## Phase 4 — Accounts beyond Apple

The same principles apply to every account that holds anything meaningful: Google, GitHub, Supabase, Twilio, bank, email, domain registrar, etc.

For every one, on a known-clean device:
1. Change the password.
2. Sign out all sessions.
3. Enable 2FA, preferably with a hardware security key. If hardware keys aren't supported, use a TOTP app (not SMS).
4. Review connected apps / OAuth tokens. Revoke anything you don't recognize.
5. Review authorized devices.
6. Review recovery email and recovery phone. Make sure they're still yours and still clean.

For GitHub specifically: **Settings → Password and authentication → Passkeys / Security keys.** Enroll a physical key. Also review **Personal access tokens** and **SSH and GPG keys** — revoke anything old.

---

## Phase 5 — Ongoing hygiene

- Run the SHIELD Hardening Checklist in the PWA weekly. It walks you through the same items and records the check. If something has drifted (e.g., Lockdown Mode got turned off), you'll know.
- Let the Mac Sentinel run 24/7 under LaunchAgent. It polls every 30s by default.
- When you install a new app: SHIELD will log a new process and, if it installs a LaunchAgent or requests a privacy permission, you'll see that in the dashboard. Confirm it matches what you just installed.
- When you travel: turn on Airplane Mode in airports and hotels. Use a cellular hotspot instead of random Wi-Fi. Lockdown Mode handles the rest.
- When you see something weird: don't ignore it. Open the PWA, tap **New Journal Entry**, and write down exactly what you saw, when, and what you did next. The hash-chained journal is your contemporaneous record, and contemporaneous records are what investigators and Apple Support care about.

---

## If you think you're actively being attacked right now

Go to [`INCIDENT_RESPONSE.md`](INCIDENT_RESPONSE.md). That's a separate, step-by-step runbook.
