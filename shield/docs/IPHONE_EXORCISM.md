# iPhone Exorcism — make the iPhone act like new without a factory reset

**Purpose.** You are running in Lockdown Mode + Stolen Device Protection, and you cannot rely on an iCloud backup for a clean restore. You want the phone to behave like a new device with a new Apple account — fresh cryptographic tokens, no lingering attacker session, no server-side presence the attacker retains — *without* a DFU wipe.

**What this runbook is.** A controlled, ordered "credential rotation + session purge + re-pair" sequence that IR professionals use when a factory reset is off the table. It is not as hermetic as DFU, but combined with Lockdown Mode it removes essentially every remote-access foothold an attacker had, invalidates every token they held, and forces the phone to re-enroll with Apple's infrastructure as if it were new.

**What this runbook is not.** A substitute for DFU against a truly nation-state-grade zero-click implant that has patched the OS kernel. If you suspect that, this sequence is not enough — only a DFU restore is. But a nation-state implant would almost certainly have been neutralized by Lockdown Mode already, because Lockdown Mode disables the exact attack surface those implants use (JIT, attachment auto-parsing, FaceTime from strangers, wired connections while locked, MDM profile installation). So in practice, for a commercial-spyware-or-below adversary running against a Lockdown-Mode phone, this runbook gets you to "effectively clean."

---

## What this achieves vs. a factory reset

|                                         | Exorcism (this doc)       | DFU factory reset |
|-----------------------------------------|---------------------------|-------------------|
| Invalidates Apple ID session tokens      | ✅                        | ✅ |
| Rotates iCloud Keychain root             | ✅ (after re-sign-in)     | ✅ |
| Kills all iMessage/FaceTime tokens       | ✅ (toggle off/on)        | ✅ |
| Kills all third-party session tokens     | ⚠️ per-app                | ✅ |
| Removes Configuration Profiles           | ✅ (manual)               | ✅ |
| Removes malicious third-party keyboards  | ✅                        | ✅ |
| Removes malicious Safari extensions      | ✅                        | ✅ |
| Removes malicious Shortcuts              | ✅                        | ✅ |
| Removes malicious Calendar subscriptions | ✅                        | ✅ |
| Re-enrolls APNs push token               | ⚠️ (toggle mitigates)     | ✅ |
| Removes persistent kernel-level implant  | ❌                        | ✅ |
| Preserves local data not in iCloud       | ✅                        | ❌ |

If Lockdown Mode is on AND the phone is up to date AND you do every step below, you are in good shape against a commercial adversary. If anything about the above assumptions is false, fall back to DFU.

---

## Pre-work — set yourself up to succeed

1. **Make a local-only backup first.** Plug the iPhone into your MacBook. Open Finder. Click the device in the sidebar. Under "Backups," choose **Back up all of the data on your iPhone to this Mac** and check **Encrypt local backup**. Set a strong backup password (store it in your password manager, not on the device). Click **Back Up Now**. This backup does NOT go to iCloud — it lives on the Mac only. If you have to roll back or factory-reset later, you at least have this.
2. **Have your rotated Apple ID credentials ready** from a clean device. You should have already changed the password at [appleid.apple.com](https://appleid.apple.com) per `HARDENING.md` Phase 0.
3. **Have two hardware security keys** (YubiKey 5C NFC × 2) in hand — primary + backup.
4. **Be somewhere quiet for 60–90 minutes.** Don't do this between meetings.
5. **Put the iPhone on your trusted Wi-Fi only.** No cellular hotspots, no café Wi-Fi, no hotel networks.

---

## Phase A — Purge the attack surface still on the device

The goal of Phase A is to remove everything an attacker could have planted that Lockdown Mode does not already neutralize. Do in order, check each step off in SHIELD.

### A1. Configuration Profiles
**Settings → General → VPN & Device Management.**

Anything listed here that you did not install yourself — delete it.

- Tap each profile → **Remove Profile** → enter passcode → Remove.
- Common malicious names: "MDM Profile," "iPhone Profile," anything with "com.cisco," "com.airwatch," "com.jamf," or a domain you don't recognize. But an attacker may also name it something plausible. **If you did not personally install it, remove it.**
- Under the same screen, also check **VPN** → delete any VPN configuration you didn't configure yourself.

Profiles are the #1 commercial spyware persistence vector on iPhone. This step alone removes more attacker capability than almost anything else.

### A2. Calendar subscriptions
**Settings → Calendar → Accounts.** Review subscribed calendars. Attackers sometimes subscribe your calendar to a remote .ics URL to inject spam events or exfiltrate time-based patterns. Remove anything you don't recognize.

### A3. Third-party keyboards
**Settings → General → Keyboard → Keyboards.**

Every third-party keyboard you have installed can see every key you type. A malicious keyboard is one of the three most common non-profile iOS backdoors.

- Tap **Edit** in the upper right.
- Swipe left on every keyboard that isn't the system one (Emoji is fine).
- If you are unsure, delete it. You can reinstall later.

### A4. Safari extensions
**Settings → Safari → Extensions.** Remove everything you do not actively use.

### A5. Shortcuts
**Open the Shortcuts app → Shortcuts tab.** Review every shortcut. Attackers can plant Shortcuts that auto-run on schedule or location. Delete any you did not create (or that aren't the four SHIELD shortcuts from [`SHORTCUTS.md`](SHORTCUTS.md)).

Also check **Automation** tab — remove any automation you did not set up.

### A6. Widget Extensions / Lock Screen widgets
**Long-press Home Screen → + in top left.** Scroll the widget gallery. Any widget from an app you don't use → delete the app.

### A7. Shared content
- **Photos → Albums → Shared Albums.** Leave any shared album you didn't create.
- **Notes → Shared.** Same.
- **Reminders → lists you were invited to.** Same.
- **Files → Shared.** Same.

These are low-bandwidth exfiltration channels.

### A8. Bluetooth
**Settings → Bluetooth.** Tap the info (i) icon next to every paired device you do not own. Tap **Forget This Device**.

### A9. AirDrop / AirPlay / Handoff
- **Settings → General → AirDrop → Receiving Off** (or Contacts Only).
- **Settings → General → AirPlay & Handoff → Handoff Off, Automatically AirPlay to TVs → Never.**

### A10. Screen Time passcode
**Settings → Screen Time → Change Screen Time Passcode.**

If a Screen Time passcode is set and you don't remember setting it, an attacker used it to limit your ability to change settings. Change it now or disable it entirely (Turn Off Screen Time). Set a new one you control if you use Screen Time.

### A11. Face ID / Touch ID alternatives
**Settings → Face ID & Passcode → Reset Face ID → set up a new face scan.**

If "Set Up an Alternate Appearance" shows an entry you didn't add, someone enrolled their face. Reset wipes it. Set it up again with only your face.

If you use Touch ID: **Settings → Touch ID & Passcode.** Check the list of enrolled fingers. Delete any you didn't add.

### A12. Passcode upgrade
**Settings → Face ID & Passcode → Change Passcode → Passcode Options → Custom Alphanumeric Code.**

Use a passphrase, not a 6-digit PIN. 14+ characters. Mix words + symbols. Memorize; do not write on the device.

### A13. Unknown apps
**Settings → General → iPhone Storage.** Scroll the full list. Every app you didn't install deliberately → tap → **Delete App**. Especially delete anything you don't remember or don't recognize. "Unused" apps can be reinstalled later from your purchase history.

### A14. Delete Safari data
**Settings → Safari → Clear History and Website Data.** This purges every Safari session token, cookie, and cached credential. You will have to log in to things again. That is fine — that is the point.

### A15. Forget every saved Wi-Fi network except your home
**Settings → Wi-Fi → Edit → Known Networks.** Delete every network except your trusted home Wi-Fi and any you absolutely must have.

---

## Phase B — Kill every outbound identity the phone holds

This phase invalidates every session token the phone has been using with Apple's and other services' backends. After this phase, an attacker holding a stolen session token cannot use it anymore.

### B1. Sign out of iMessage
**Settings → Messages → iMessage → Off.** Wait 10 seconds. Turn it back on. This forces a re-registration of the phone's iMessage identity keys. Any stolen keys become invalid.

### B2. Sign out of FaceTime
**Settings → FaceTime → Off.** Wait 10 seconds. Turn back on. Same effect.

### B3. Regenerate mail accounts
**Settings → Mail → Accounts.** For each mail account (Gmail, iCloud Mail, Exchange, Fastmail):

- Tap the account → Delete Account.
- Add it back fresh. This forces OAuth / IMAP re-authentication. Any stolen OAuth refresh token is no longer paired with a live session.
- For Google Workspace: go to myaccount.google.com from a clean device first and revoke any "Apple Mail" session you don't recognize, then add the account back on the phone.

### B4. Sign out of every third-party app that stores credentials
Go through the Home Screen. For each app that holds an account (banking, social, dev tools, 1Password, Slack, etc.):

- Sign out from within the app.
- If the app supports it, revoke the session from the web dashboard of that service.
- Sign back in fresh with a rotated password + 2FA.

This is the boring step. Do it anyway. Every stolen refresh token becomes useless.

### B5. Rotate app-specific passwords
[appleid.apple.com](https://appleid.apple.com) → Sign-In and Security → App-Specific Passwords. Revoke any active ones. Generate new ones if you need them.

### B6. iCloud sign-out-and-back-in
This is the one that most closely simulates "new phone."

1. **Settings → [Your Name] → Scroll to bottom → Sign Out.**
2. Apple will ask you to enter your Apple ID password to turn off Find My. Enter it.
3. For iCloud data you want to keep on-device during sign-out, toggle the relevant items ON in the "Keep a Copy on This iPhone" list. Contacts, Calendars, Keychain, Safari, Notes — **keep a copy.** You can move them back when you sign back in.
4. Tap **Sign Out**.
5. Wait until sign-out finishes — can take a minute.
6. **Settings → Sign in to your iPhone.**
7. Sign in with your rotated Apple ID password.
8. Complete 2FA.
9. After sign-in, go to **Settings → [Name] → Sign-In & Security → Security Keys → Add Security Key.** Add both YubiKeys now, while on a trusted network.
10. **Settings → [Name] → iCloud → turn on Advanced Data Protection** if it isn't on.
11. **Settings → [Name] → iCloud → Keychain → On** if you use Keychain.
12. **Settings → Messages → iMessage Contact Key Verification → On.**

At this point the phone has a fresh Apple ID session, rotated iCloud Keychain encryption root, new iMessage/FaceTime registration, new APNs tokens as a side effect, and hardware-key-required sign-in going forward. For an attacker relying on stolen Apple ID credentials or stolen iCloud tokens, this is a hard cut.

### B7. Wallet / Apple Pay
**Settings → Wallet & Apple Pay.** Remove every card. Re-add them. Each card re-provisions with the bank, which rotates the device-specific token (DPAN).

If you don't use Wallet, remove any card that's there.

---

## Phase C — Re-baseline

After Phase A and B, the phone has been scrubbed of surface attacker persistence, and every live token has been rotated. Phase C is about establishing a clean baseline so that from this moment forward, any drift is an attacker.

### C1. Record the current state
On the phone, run the `SHIELD Log Snapshot` Shortcut (from [`SHORTCUTS.md`](SHORTCUTS.md)). It writes current SSID, device model, and battery to a Note. Take that Note's content and paste it into a SHIELD journal entry on the PWA titled "Post-exorcism baseline."

### C2. Record the installed app list
**Settings → General → iPhone Storage.** Screenshot the full list. Attach the screenshots to a SHIELD journal entry. This is your app-list baseline; any new app that appears later without you installing it is an alert.

### C3. Record the profile state
**Settings → General → VPN & Device Management.** It should say "No profiles installed" at the top. Screenshot it and attach it to SHIELD.

### C4. Record the keyboard list
**Settings → General → Keyboard → Keyboards.** Only the system keyboard (+ Emoji). Screenshot. Attach to SHIELD.

### C5. Record the Bluetooth pair list
**Settings → Bluetooth.** Should be empty or contain only your own devices. Screenshot. Attach.

### C6. Record the Wi-Fi network list
**Settings → Wi-Fi → Edit.** Screenshot the known networks list. Attach.

### C7. Leave the local Finder backup alone
The encrypted local backup you made in the Pre-work is your rollback. Do not delete it for at least a week. If anything weird happens and you need to factory-reset, you have this.

### C8. Run the SHIELD hardening checklist
Open the PWA → Harden tab → go through every item in Phase 1 (iPhone). Check off each as you verify it is still set correctly.

---

## Phase D — Physical hardening

These are the "an attacker in the same building" steps.

### D1. Change your Wi-Fi password
Router admin → change SSID *and* password. The SSID change forces every device to re-associate, which means any device that was quietly on your network before and doesn't know the new SSID/password is now off your network. SHIELD Mac Sentinel will also flag the SSID change as a MEDIUM event — harmless in this case because you triggered it.

### D2. Turn off Personal Hotspot unless you actively need it
**Settings → Personal Hotspot → Off.** A personal hotspot is a Wi-Fi access point your attacker can try to join.

### D3. Disable "Allow Accessories" while locked
**Settings → Face ID & Passcode → scroll down → Allow Access When Locked → Accessories → Off.**

This blocks USB/Lightning/USB-C accessories from establishing a data connection unless you unlock the phone within the past hour. It is the single most effective mitigation against physical-access attacks like the "Cellebrite" category of forensic extraction boxes and hostile juice-jacking cables.

Lockdown Mode already enforces this automatically, but set it manually too as a belt-and-suspenders measure.

### D4. Disable "Siri" from the lock screen
**Settings → Face ID & Passcode → Allow Access When Locked → Siri → Off.**

Siri from the lock screen has historically leaked contact data and been part of bypass chains. Turn it off.

### D5. Disable "Today View," "Notification Center," and "Control Center" from the lock screen
Same screen as above. All off. Your lock screen should be minimal.

---

## After the exorcism

- **For 48 hours,** watch the SHIELD dashboard and write a brief journal entry any time something unexpected happens.
- **After 48 hours of clean observation**, delete the encrypted local Finder backup — it is no longer needed as a rollback and it is itself a sensitive artifact if your Mac is ever compromised.
- **Weekly,** run the SHIELD hardening checklist. It walks through everything and records a timestamped check so you have a record of drift.

If at any point you see a Configuration Profile reappear, a new keyboard you didn't install, a new Shortcut you didn't create, or SHIELD's Mac Sentinel reports a LaunchAgent drift on the MacBook you can't explain, **that is your signal to do the DFU reset after all**. At that point the adversary has a persistence mechanism that survived exorcism, and only DFU will evict them.

---

## What to tell people helping you

If you hand this runbook to a security professional, the one-liner is:

> "Phase A surface purge → Phase B token rotation via iCloud sign-out/in and per-service re-auth → Phase C baseline recording via SHIELD's hash-chained journal → Phase D physical/accessory hardening. Goal is effective credential rotation and session invalidation without a DFU, justified by the phone being in Lockdown Mode and the adversary being plausibly commercial-grade rather than nation-state-kernel-grade."

They will know what you mean.
