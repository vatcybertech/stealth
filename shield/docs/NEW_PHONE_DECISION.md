# When to get a new iPhone

**You asked for a hard, honest threshold. Here it is.** This is not "always wipe, just in case." It is the specific list of conditions under which exorcism + rotation is not enough and you actually need a different device.

---

## The short version

**Keep the current iPhone if ALL of these are true:**
- You are running Lockdown Mode.
- [`IPHONE_EXORCISM.md`](IPHONE_EXORCISM.md) has been completed, every phase, every step.
- After exorcism, SHIELD's Mac Sentinel is not raising any CRITICAL events on the Mac side that you cannot explain.
- Nothing from the "replace now" list below has happened since exorcism.
- You have hardware security keys on your Apple ID.
- You completed the hardening runbook.

**Replace the iPhone (new hardware, new SIM, new Apple ID from a clean device) if ANY of the following are true:**

### Replace now — no further troubleshooting
1. **A Configuration Profile re-appeared** in Settings → General → VPN & Device Management *after* you removed all of them during exorcism. This means persistence survived the surface scrub and is actively re-installing. DFU might also fix it; a new phone is faster and safer.
2. **Apple sent you a Threat Notification.** Apple only sends these when they have high confidence you are being targeted by state-sponsored attackers. You act on these — not evaluate them.
3. **You received a mysterious second-factor code or login notification** for your Apple ID, on a device you did not initiate. After rotation. This means someone is still actively attacking the account pointed at this phone.
4. **SHIELD's Mac Sentinel is raising `LAUNCHAGENT_NEW` or `PROFILE_PRESENT` events on the Mac immediately after the phone connects to it via Finder or USB.** The phone is actively infecting the Mac. That behavior requires a trust-level implant; replace the phone.
5. **Physical-proximity compromise proven.** You found a device on your person or in your bag that you did not put there. You found a cable you don't recognize in your drawer. Replace the phone, replace the cables, replace the charger.
6. **The phone is 5+ years old and cannot receive the latest iOS.** Without current security patches, no amount of runbook completion helps. New phone.
7. **Battery health is below 80% AND you are seeing weird overheating / sudden drain patterns.** Not definitive (old battery does this too), but combined with any of 1-5, it's confirming.
8. **You cannot complete exorcism because the phone is fighting you** — settings flip back after you change them, the iCloud sign-out hangs, a Profile re-appears within minutes, a keyboard you just deleted comes back. That's active interference. Replace.

### Consider replacement if the cost fits your situation
- **You can afford it and you have significant peace of mind at stake.** A new iPhone + Lockdown Mode + new Apple ID is the cleanest possible baseline. For the money, it's a reasonable purchase as insurance against a lingering unknown.
- **You have been in a situation where your phone was out of your physical custody for any amount of time** (left behind at a repair shop, at a border checkpoint, in someone else's possession briefly). Custody chain breaks = you don't know what happened to the device. If the threat model matters, replace.

### Do NOT replace just because
- SHIELD is raising occasional LOW or MEDIUM events on the Mac. That's normal operation. LOW/MEDIUM are "check this out when you have a minute," not "burn everything."
- You see an unfamiliar device on your home Wi-Fi once and it goes away. Could be a neighbor's phone briefly leaking onto your AP, could be a delivery driver with an Android hotspot. Note it, whitelist if it's yours, move on.
- Battery drains faster than it used to. After 2+ years of use, this is the battery, not spyware, 95% of the time.
- Lockdown Mode "feels restrictive." That is the point. Lockdown Mode saves you from most of what you're worried about. Don't turn it off.

---

## How to replace — the procedure

If you determine you need a new phone, do it in this exact order. Mistakes at the transition are the most dangerous part; get them right once.

### Step 1 — buy the phone
- Buy direct from Apple (apple.com or an Apple Store). Not from a third-party reseller, not from eBay, not from a refurbished marketplace. For a new Apple ID starting clean, provenance matters.
- Pay with a card that is not currently in your old phone's Wallet. If you only have cards in Wallet, use cash or a check in-store, or add a new card to a clean device first.
- Do NOT sign in with your current Apple ID when the Apple Store employee walks you through setup. Tell them you want to finish setup at home.
- Buy a new cable and a new 20W USB-C power adapter. Do not reuse cables.

### Step 2 — set up from a clean environment
- Do the initial unbox and first boot from a location that is not your normal desk / home / office. Any location where the Wi-Fi is new and un-paired to your identity. A library. A coffee shop. A friend's place.
- On the new phone, when asked:
  - **Language / Country:** normal.
  - **Wi-Fi:** the temporary location's network.
  - **Apple ID:** **do not sign in yet.** Tap "Forgot password or don't have an Apple ID?" → "Set Up Later in Settings."
  - **Face ID:** set up.
  - **Passcode:** use a **long alphanumeric passphrase**. Not 6 digits.
  - **Apps & Data:** **Don't Transfer Apps & Data.** Not from Mac. Not from iCloud. Not from another iPhone. Nothing.
  - Finish setup as a fresh device with no Apple ID.

### Step 3 — enable Lockdown Mode immediately
- **Settings → Privacy & Security → Lockdown Mode → Turn On & Restart.** Before doing anything else. Before signing in to anything. Do this on airplane mode if you want to be safest — you don't need internet for Lockdown Mode.

### Step 4 — create a new Apple ID
- From a clean Mac (the one running SHIELD, after you have confirmed it is not raising any CRITICAL events), go to appleid.apple.com and **Create Your Apple ID**.
- Use an email you have never used before for Apple ID. Use Hide My Email or a new purchase-only mailbox.
- Use a 20+ character random password, stored in a password manager.
- Complete setup. Add both YubiKeys as security keys. Enable Advanced Data Protection.
- On the new phone: Settings → Sign in to your iPhone → sign in with the new Apple ID.

### Step 5 — add apps selectively
- Install **only** the apps you genuinely use daily. Not the backlog, not the "might be useful someday" apps. From a smaller installed surface, anomaly detection works better.
- For each app, create a new account or use OAuth through your new email, not your old accounts.
- Re-enable iMessage and FaceTime only after all the above is done.

### Step 6 — retire the old phone properly
- **Do not sell or give away the old phone.** The threat model that made you replace it makes it irresponsible to hand it to someone else.
- **Do not throw it in a drawer and forget it.** An attacker who retained access to the old phone still has access for as long as it has battery.
- **Settings → General → Transfer or Reset iPhone → Erase All Content and Settings** on the old phone. This is the T2/Apple-Silicon secure wipe. Even if it doesn't evict a persistent implant, it removes the attacker's session.
- Then **physically destroy** or **return to Apple** for trade-in credit. Apple's trade-in process wipes and recycles; it is fine. If you are paranoid: remove the SIM, drill through the SoC with a drill bit, recycle.

### Step 7 — new phone number?
- Optional but worth considering. If your phone number has been widely known, a new SIM with a new number cuts off a persistent SMS-based vector.
- This is more disruptive than a new device. Most people don't need it. If you're unsure, ask yourself: has anyone ever reached you via SMS in a way that made you uncomfortable? If yes, new number. If no, keep it.

---

## How to actually complete exorcism on the current phone if you're NOT replacing

If none of the hard-replace conditions apply, then exorcism is the right path. The full runbook is at [`IPHONE_EXORCISM.md`](IPHONE_EXORCISM.md). Budget 90 minutes. Do it once, all the way through, in one sitting. Don't stop halfway. Partial exorcism is worse than none because it tells the attacker what you're doing without completing the rotation.

The PWA Hardening tab has all 26 exorcism steps as checkable items. Each check gets a timestamped entry in your tamper-evident journal, so you have a record of when you did what.

---

## What to tell your networking / cybersec contacts

If you want a professional second opinion before replacing:

> "I am running iOS with Lockdown Mode and have completed the [exorcism runbook]. SHIELD Mac Sentinel is raising [specific event type] with [specific detail]. I want to know whether this event pattern is sufficient to justify device replacement, or whether further containment on the existing hardware is appropriate."

Attach:
- The SHIELD evidence export (Signed JSON from the PWA Evidence tab)
- The specific event IDs and timestamps from the ledger
- Your recent journal entries from the PWA
- The output of `profiles show -type configuration` on the Mac
- The output of `launchctl list` on the Mac

A competent security professional (yours, or Access Now's free helpline) can read that in 10 minutes and tell you yes or no.

---

## Bottom line

Replace if you see persistence re-appear after removal, if Apple warns you, if you have physical chain-of-custody doubts, or if exorcism actively fails. Do not replace out of anxiety alone — a new phone improperly configured is worse than your current phone well-configured. Complete exorcism first, observe for 72 hours with SHIELD running, and escalate from the data.
