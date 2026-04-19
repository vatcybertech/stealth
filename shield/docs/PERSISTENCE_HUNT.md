# Persistence Hunt — find every place an attacker could be hiding

Use this when you suspect compromise but cleanup hasn't stuck. Walk it top to bottom, in order, on a calm day. Document what you find before changing anything.

The goal: identify the **one thing** that is letting them keep coming back. In our case, the working theory is that the phone number was the foothold (only constant across the full rebuild). But there are other places persistence hides, and ruling them out is part of the job.

---

## Hunt order — top of the kill chain to bottom

### 1. Identity (account-level — works long-range, no malware needed)

- [ ] **Apple ID:** appleid.apple.com → Devices. Sign out everything you don't currently hold.
- [ ] **Apple ID → Sign-In & Security → Account Recovery** → no recovery contacts. Add only after rebuild.
- [ ] **Apple ID → Sign-In & Security → Trusted Phone Numbers** → only numbers you currently control.
- [ ] **Apple ID → Sign-In & Security → Apps Using Apple ID / Sign in with Apple** → revoke anything unrecognized.
- [ ] **Google account** (if used): myaccount.google.com → Security → Your Devices, Third-party apps with account access, Less secure app access. Sign out everything.
- [ ] **Microsoft account** (if used): same audit.
- [ ] **Bank, brokerage, retirement** — log into each, check active sessions if shown, force sign-out elsewhere.
- [ ] **Password manager** — audit logged-in devices. 1Password, Bitwarden, Apple Passwords all show this.

### 2. Email (the most under-audited persistence layer)

- [ ] **Forwarding rules.** This is the #1 stalker move — set once, never need to come back.
  - iCloud: mail.icloud.com → ⚙ Preferences → Rules.
  - Gmail: Settings → Forwarding and POP/IMAP, AND Settings → Filters and Blocked Addresses.
  - Outlook: Settings → Mail → Rules, AND Settings → Mail → Forwarding.
  - Proton: Settings → Mail → Filters, AND Settings → Mail → Auto-reply.
- [ ] **Send-as / send-from identities** (Gmail can send mail as if you, on the attacker's behalf).
- [ ] **App passwords** (Gmail / iCloud) — revoke all and reissue only what you need.
- [ ] **OAuth grants on your email** — every app with mail access. Revoke unknowns.
- [ ] **Recovery email** on each account. Should be an address you fully control.

### 3. Phone number (your specific foothold)

- [ ] Carrier portal password rotated (20+ chars).
- [ ] Carrier account PIN / port-out PIN set (long random).
- [ ] Carrier 2FA → hardware key if supported, otherwise authenticator app, never SMS-on-the-same-line.
- [ ] Carrier authorized users → audit. Anyone listed can call in and authorize changes.
- [ ] Carrier SIM history — most portals show recent SIM changes; investigate any you didn't make.
- [ ] Call forwarding — dial `*#21#` from your phone. Should show no forwarding. (`##002#` clears all forwarding if anything is set.)
- [ ] iMessage / FaceTime tied to number — Settings → Messages → Send & Receive → audit. Sign out of iMessage entirely if possible.
- [ ] Signal, WhatsApp, Telegram → re-register on this device with a registration lock PIN. Settings → Account → Registration Lock.

### 4. Mobile Device — Configuration Profiles + MDM

- [ ] iPhone: Settings → General → VPN & Device Management. **Delete every profile and every MDM enrollment.** Anything labeled MDM that you didn't authorize means the device is enrolled into a server you don't control.
- [ ] iPhone: Settings → Screen Time → Content & Privacy Restrictions. If on, and you don't know the Screen Time passcode, that's a smoking gun. Factory reset.
- [ ] Mac: System Settings → Privacy & Security → Profiles. Same.
- [ ] Mac: `sudo profiles list` in Terminal — should match what the GUI shows.

### 5. Mobile Device — apps + permissions

- [ ] iPhone home screen + App Library — delete anything you didn't install.
- [ ] iPhone Settings → Privacy & Security → walk every category, default-deny anything not actively needed.
- [ ] iPhone Settings → Privacy & Security → Tracking → Off.
- [ ] iPhone Settings → Notifications → Focus → delete every Focus you didn't create.
- [ ] App Store → Subscriptions → cancel anything you don't recognize.

### 6. Mac — startup persistence

- [ ] System Settings → General → Login Items → both tabs. Delete unknowns.
- [ ] `ls -la ~/Library/LaunchAgents`
- [ ] `ls -la /Library/LaunchAgents`
- [ ] `ls -la /Library/LaunchDaemons`
- [ ] For each unknown: `cat` the plist, look at the `Program` / `ProgramArguments`. Anything pointing into `/tmp`, `/var/tmp`, your home `Downloads`, or unsigned binaries is hostile.
- [ ] `crontab -l` and `sudo crontab -l` — should be empty for most users.
- [ ] `at -l` — scheduled at-jobs.

### 7. Mac — privileged permissions

- [ ] System Settings → Privacy & Security → **Full Disk Access** — every entry is a god-mode app. Audit ruthlessly.
- [ ] Same for **Accessibility, Input Monitoring, Screen Recording, Automation**.
- [ ] `sudo ls -la /etc/sudoers.d/` — only `shield` (if installed) should appear.
- [ ] `sudo cat /etc/sudoers` — only standard rules.

### 8. Mac — system tampering

- [ ] `csrutil status` → enabled.
- [ ] `spctl --status` → assessments enabled.
- [ ] `fdesetup status` → On.
- [ ] `cat /etc/hosts` → only loopback entries.
- [ ] `sudo lsof -nP -iTCP -sTCP:LISTEN` → audit listeners.
- [ ] `system_profiler SPApplicationsDataType | grep -i "obtained from"` → look for "Unknown" — those are unsigned apps.

### 9. Network — your gateway is a computer too

- [ ] Router: log into the admin UI. Change password. Update firmware. Audit DHCP client list — every device. Audit port forwards (should be empty unless you set one). Audit DNS configuration. Audit DDNS (anything pointing your home address to a domain).
- [ ] Router admin from WAN — **disabled**.
- [ ] Router UPnP — disabled.
- [ ] Router guest network — disabled unless used (and isolated).
- [ ] Router → factory reset and reflash with current firmware if you can't account for every setting.
- [ ] If you don't trust the router (ISP-supplied or unflashable consumer gear): replace. ISP modems too.
- [ ] DNS: every device should use a DNS you trust (Cloudflare 1.1.1.2 with malware blocking, NextDNS with custom rules, Quad9, your own resolver).

### 10. Cloud storage / sync

- [ ] iCloud Drive → review. Anything sharing folders with anyone you don't recognize → revoke.
- [ ] Google Drive, Dropbox, OneDrive → audit shared folders / files.
- [ ] Photos → Shared Albums → audit; revoke every album you don't own.
- [ ] Notes → Shared Notes → audit.
- [ ] Calendar → audit subscribed calendars (a malicious .ics URL can include "remind me" events that exfiltrate when triggered).

### 11. Browser

- [ ] Each browser → Extensions → remove every one. Reinstall only audited extensions from the browser's store.
- [ ] Each browser → Settings → Search Engines → audit; remove unknowns.
- [ ] Each browser → cleared website data, cookies, cache.
- [ ] Each browser → Profiles (Chrome/Edge/Brave) → delete profiles you don't use.

### 12. Physical

- [ ] Bag, jacket, car (under seats, wheel wells, license plate frame, OBD-II port), laptop sleeve, kid's backpack, partner's bag, anything you carry → physically search for AirTags, Tiles, SmartTags, generic GPS trackers.
- [ ] Borrow an Android phone, install **AirGuard** (free, open source) → walk through your house, car, bag. AirGuard sees Apple BT trackers using a different stack than iOS, harder to suppress.
- [ ] Audit all USB cables and chargers — replace any you didn't buy yourself. Malicious cables (O.MG cable family) look identical to legitimate Lightning/USB-C.

### 13. Browsers + Apple ID third-party logins

- [ ] appleid.apple.com → Sign in with Apple → audit and revoke every app you don't actively use.
- [ ] Any "Sign in with Google" → google.com/security → Apps with account access.
- [ ] Microsoft / GitHub / Twitter / Facebook same.

---

## Triage — what to do when you find something

1. **Don't delete first.** Take a screenshot or photo on a separate device. Note timestamp and what you observed.
2. If it's an unknown LaunchAgent / process / profile: copy the file or its plist to an `Evidence` folder on an encrypted USB drive before removing.
3. **Then** disable / remove / quarantine.
4. After cleanup, monitor for 48 hours. If the same thing reappears, you have a more privileged piece of malware re-installing it — escalate to professional forensics.

If you find anything in categories 1, 2, or 4 (account, email forwarding, MDM profile) — **assume the device is compromised at the OS level** and proceed to factory reinstall (Mac: `MAC_LOCKDOWN_MAX.md` Phase 1; iPhone: `IPHONE_EXORCISM.md`).
