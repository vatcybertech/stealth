# iPhone — Maximum Lockdown

Every setting, in order. Do every step. Skip nothing. This is built around the fact that the attacker has used Voice Control, Braille, Bluetooth, AirDrop, Hotspot, and "anything a user can access." We disable every channel that isn't actively in use, every day.

If a feature is greyed out and you can't change it, that is itself an indicator of compromise — see "Greyed-out settings" at the bottom.

---

## Phase 0 — Before you touch the phone

Do these on a different known-clean device first.

- [ ] Sign in to `appleid.apple.com` from a clean device. Change Apple ID password to 20+ random chars from a password manager.
- [ ] Sign out every device you don't recognize.
- [ ] Devices → review every authorized device. Anything you don't own → remove.
- [ ] Sign-In & Security → Account Recovery → remove every Recovery Contact and Legacy Contact. Re-add later, only after rebuild.
- [ ] Sign-In & Security → Trusted Phone Numbers → leave only the numbers you currently control.
- [ ] Add **two hardware security keys** (YubiKey 5C NFC works on iPhone 15). One primary, one in a safe.

## Phase 1 — Erase and rebuild

If at all possible, **factory reset the iPhone via Finder on a Mac (not over-the-air, not via iCloud restore).** Set up as a new device. Do not restore from any backup.

If you cannot factory-reset (lost data risk), follow `IPHONE_EXORCISM.md` instead — every step.

## Phase 2 — Apple ID + iCloud (during setup or first boot)

- [ ] Sign in with the rotated Apple ID.
- [ ] **Skip** "Restore from Backup" and "Restore from iCloud."
- [ ] Settings → [Name] → iCloud → **Advanced Data Protection** → Turn On. End-to-end encrypts iCloud so even Apple cannot decrypt.
- [ ] Settings → [Name] → iCloud → iCloud Drive, Photos, Messages, Keychain — decide explicitly which sync. If unsure, turn each off.
- [ ] Settings → [Name] → Find My → Find My iPhone → On. Share My Location → **Off**. Find My Network → On. Send Last Location → On.
- [ ] Settings → [Name] → Family Sharing → leave or remove. Anyone with family access can see your location and devices.
- [ ] Settings → [Name] → Sign-In & Security → Two-Factor Authentication → Security Keys → add both YubiKeys.

## Phase 3 — Lockdown Mode

- [ ] Settings → Privacy & Security → Lockdown Mode → **Turn On & Restart**.
- [ ] After restart, exempt only the apps you absolutely need (Settings → app → Lockdown Mode → exempt). Default is "no exemptions."

Lockdown Mode disables: link previews, JIT JavaScript, FaceTime invitations from unknown numbers, shared albums, complex web fonts, message attachments other than images, configuration profile installation. **It is the single largest hardening lever Apple gives you.**

## Phase 4 — Passcode + biometrics

- [ ] Settings → Face ID & Passcode → Change Passcode → Passcode Options → **Custom Alphanumeric Code**. 14+ characters. Mix case, numbers, symbols. Memorize it; never type it where a camera can see.
- [ ] Require Passcode → Immediately.
- [ ] Allow Access When Locked → **turn OFF every toggle**: Today View, Notification Center, Control Center, Siri, Reply with Message, Home Control, Wallet, Return Missed Calls, USB Accessories, Accessories.
- [ ] **USB Accessories: OFF.** This is critical. Stops Lightning/USB-C accessories from working when phone has been locked > 1 hour. Defeats GrayKey, Cellebrite, malicious cables.
- [ ] Erase Data: **ON.** Ten wrong passcodes wipes the phone.
- [ ] Face ID → Require Attention for Face ID → **ON**. Attention-Aware Features → ON.

## Phase 5 — Radios (the channels they used)

Default position: every radio off unless you are actively using it that minute.

- [ ] Settings → Wi-Fi → **Off** (you said you're not using Wi-Fi on phone — keep it that way).
- [ ] Settings → Wi-Fi → "Ask to Join Networks" → **Off**. "Auto-Join Hotspot" → **Never**.
- [ ] Settings → Wi-Fi → Edit (top right) → **forget every saved network**. A saved network = an attacker can spin up an evil-twin AP your phone auto-joins.
- [ ] Settings → Bluetooth → **Off**. Only turn on for the seconds needed to pair something. Audit paired devices: forget anything you don't actively use.
- [ ] Settings → Cellular → Wi-Fi Calling → **Off** (sends calls over Wi-Fi when available; you're not using Wi-Fi).
- [ ] Settings → Cellular → Personal Hotspot → **Off**. Allow Others to Join → off. Maximize Compatibility → off.
- [ ] Settings → Cellular → Cellular Data Options → Data Mode → Standard. Data Roaming → Off unless traveling.
- [ ] Settings → General → AirDrop → **Receiving Off**. Always.
- [ ] Settings → General → AirPlay & Handoff → Handoff → **Off**. Continuity Camera → off. AirPlay → "Never" or "Ask."
- [ ] Settings → General → AirPlay & Handoff → Automatically AirPlay → **Never**.

## Phase 6 — Accessibility (the attack surface they used)

This is the section that matters most given what they did to you. Accessibility features grant programmatic control over the device. Every one you don't actively use is an attack surface.

- [ ] Settings → Accessibility → **Voice Control** → **Off**. Voice Control accepts spoken commands as if you typed them. Audio injection (a speaker near you) can drive your phone.
- [ ] Settings → Accessibility → **Switch Control** → **Off**. Switch Control lets external switches (BT, camera, screen) operate the phone. A malicious BLE switch = full control.
- [ ] Settings → Accessibility → **Braille** (under VoiceOver → Braille) → remove every Braille display you don't physically own. A BLE Braille display registers as HID and can inject input.
- [ ] Settings → Accessibility → AssistiveTouch → **Off** unless you need it.
- [ ] Settings → Accessibility → Touch → Back Tap → **Off**. (Back-tap can trigger arbitrary shortcuts.)
- [ ] Settings → Accessibility → Touch → Reachability → off if not used.
- [ ] Settings → Accessibility → Live Captions → **Off** (uses microphone continuously).
- [ ] Settings → Accessibility → Hearing Devices → remove anything paired you don't own.
- [ ] Settings → Accessibility → Guided Access → **On**, set a separate passcode. Use it when you hand the phone to anyone — even briefly.
- [ ] Settings → Accessibility → Per-App Settings → review; default to nothing.

## Phase 7 — Siri

- [ ] Settings → Siri & Search → Listen for "Hey Siri" → **Off**.
- [ ] Press Side Button for Siri → **Off** (unless you genuinely use Siri).
- [ ] Allow Siri When Locked → **Off**.
- [ ] Show Suggestions in Search → off. Show Suggestions on Lock Screen → off. Show Suggestions when Sharing → off.
- [ ] Per-app Siri & Search → review; turn off for sensitive apps (Mail, Messages, Notes, banking, health).

## Phase 8 — Privacy & Security (audit every category)

Settings → Privacy & Security. Walk every category. Remove every app you don't recognize, and every permission you don't actively need.

- [ ] Location Services → audit. Most apps should be **Never** or **Ask Next Time**. System Services (bottom) → turn off everything not essential (Significant Locations is a goldmine for stalkers — turn off and clear history).
- [ ] Tracking → "Allow Apps to Request to Track" → **Off**.
- [ ] Contacts → audit. Apps with full contact access can exfiltrate every relationship in your life.
- [ ] Calendars, Reminders, Photos, Bluetooth, Microphone, Speech Recognition, Camera, Health, HomeKit, Media & Apple Music, Files, Motion & Fitness, Focus, Local Network, Nearby Interactions → audit each. Default deny.
- [ ] Analytics & Improvements → Share iPhone Analytics → **Off**. Share iCloud Analytics → Off. Improve Siri & Dictation → Off.
- [ ] Apple Advertising → Personalized Ads → **Off**.
- [ ] App Privacy Report → On (turn this on to see what apps actually do).
- [ ] Sensitive Content Warning → On.

## Phase 9 — Notifications (the silencing channel)

Attacker silenced your alerts. Counter:

- [ ] Settings → Notifications → audit each app. Critical alerts (banking, security apps, Sentinel) → enable Time-Sensitive + Critical Alerts.
- [ ] Settings → Notifications → Show Previews → **Never** or **When Unlocked**. Default "Always" leaks notification content from your lock screen.
- [ ] Settings → Notifications → Scheduled Summary → **Off**. Otherwise notifications get bundled and easy to overlook.
- [ ] Settings → Focus → review each Focus mode. A malicious Focus can suppress all notifications. **Delete every Focus you didn't create.**

## Phase 10 — General hygiene

- [ ] Settings → General → VPN & Device Management → **delete every Configuration Profile and MDM enrollment you did not personally install**. Anything labeled "MDM" you don't recognize = managed-device compromise.
- [ ] Settings → General → Background App Refresh → **Off** for everything that doesn't need it (most things).
- [ ] Settings → General → AutoFill → review. Saved passwords go through Settings → Passwords (audit there).
- [ ] Settings → Passwords → audit every entry. Turn on Detect Compromised Passwords. Use only Passwords app or your dedicated password manager — not both.
- [ ] Settings → Safari → Privacy & Security → block all cross-site tracking, hide IP from trackers, fraudulent site warning on, JS off if you can tolerate it. Clear History and Website Data.
- [ ] Settings → Safari → Extensions → audit; delete unknown.
- [ ] Settings → Mail → Privacy Protection → Protect Mail Activity **On** (hides IP, preloads remote content via proxy).
- [ ] Settings → Messages → iMessage → **consider turning off entirely** (you said the number is the foothold; iMessage rides the number). Use Signal instead.
- [ ] Settings → FaceTime → off if not used.
- [ ] Settings → Game Center → Sign Out (broadcasts identity).
- [ ] Settings → General → AirPort → if Settings → General → AirDrop allows everyone, set Receiving Off.

## Phase 11 — Apps

- [ ] Walk every app on the home screen. **Delete anything you didn't intentionally install.** App Library → swipe through every category.
- [ ] App Store → Account → Subscriptions → audit; cancel any you don't recognize.
- [ ] App Store → Search → look up "MDM," "remote management," "monitoring," "parental" — anything matching an installed app is a major flag.

## Phase 12 — Network

- [ ] Settings → Wi-Fi → (i) on each saved network → Configure DNS → **Manual** → set to `1.1.1.2` and `1.0.0.2` (Cloudflare malware-blocking) or your own DNS-over-HTTPS provider. Default ISP DNS is logged and can be hijacked.
- [ ] Same for Cellular: Settings → Mobile → DNS configuration if your carrier supports it.
- [ ] Settings → General → VPN → only use a VPN you trust (Mullvad, IVPN, ProtonVPN). Set "Connect On Demand" if available.

## Phase 13 — Physical

- [ ] Camera cover (cheap sticker on front and back cameras when not in use).
- [ ] Faraday pouch (Mission Darkness or Silent Pocket) for when phone is not in active use, especially overnight and in untrusted environments.
- [ ] Never leave the phone unattended, even briefly. Five seconds is enough to install a Configuration Profile.
- [ ] Never plug into a public USB port. Carry your own charger and a "USB condom" (data-blocker) if you must use unknown power.

---

## Greyed-out settings = compromise indicator

If toggles are greyed out or you can't change a setting, the most common causes are:
1. A **Configuration Profile** is enforcing the value. Settings → General → VPN & Device Management → remove the profile.
2. **Screen Time → Content & Privacy Restrictions** is enforcing it. Settings → Screen Time → Content & Privacy Restrictions → off (you may need a Screen Time passcode; if you don't know it and didn't set one, that's the smoking gun — go to Phase 1, factory reset).
3. **Supervised mode** is on. The phone has been enrolled into a corporate/educational/MDM management. Only a factory reset via DFU clears this.

---

## Daily routine after setup

- Bluetooth on only when actively pairing.
- Wi-Fi off (your decision).
- Hotspot off.
- AirDrop receiving off.
- Phone in Faraday pouch when sleeping or in untrusted environments.
- Once a week: walk Settings → General → VPN & Device Management, Settings → Privacy & Security, Settings → Notifications → Focus to verify nothing new appeared.
