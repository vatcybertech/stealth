# SHIELD Incident Response Runbook

**When to use this document:** You are seeing something you cannot explain on your iPhone or MacBook, or SHIELD has raised a HIGH or CRITICAL alert, or you have any other reason to believe someone is actively attempting to compromise your devices or accounts.

**Pace:** Read the whole document once before you start. Then act. Do not panic — an adversary with capability has already spent their hardest effort getting in; your calm, deliberate response is what gets them out.

---

## Step 0 — Preserve, don't destroy

Before you change anything:

1. **Open the SHIELD PWA → New Journal Entry.** Write down exactly what you saw, in your own words, with the timestamp. Include: what you were doing, which device, what changed, who (if anyone) else was around. Be specific.
2. **Take screenshots of the anomaly** on the affected device. On iPhone: side button + volume up. On Mac: Shift+Cmd+4 then select region, or Shift+Cmd+3 for full screen. The screenshots will save to Photos / Desktop. Move them into SHIELD's Journal (attach them to the entry you just created) — SHIELD stores photos encrypted in IndexedDB so the adversary cannot delete them from the Photos library without also breaking SHIELD's hash chain (which SHIELD will detect).
3. **If the Mac Sentinel is running, export the current ledger.** From the PWA: Dashboard → Export Evidence → Signed JSON. This produces a hash-chained, integrity-checked snapshot of everything the Sentinel has seen since you installed it. Save it to an external drive, a second trusted device, or print it.
4. **Do not wipe the device yet.** Evidence is only useful before you destroy it.

---

## Step 1 — Assess severity

Ask these questions honestly:

| Question | If yes |
|---|---|
| Is there a Configuration Profile on your iPhone you did not install? | **Critical.** Someone has admin-equivalent access. Jump to Step 2. |
| Is Lockdown Mode, FileVault, SIP, or Firewall off when you remember turning it on? | **Critical.** Jump to Step 2. |
| Is there a new LaunchAgent or LaunchDaemon on the Mac you did not install? | **Critical.** Jump to Step 2. |
| Is there an unsigned or ad-hoc-signed process running on the Mac? | **High.** May be benign (some dev tools) — investigate before wiping. |
| Did you receive an Apple Threat Notification? | **Critical.** Apple only sends these when they have high confidence of state-sponsored targeting. Go to Step 4. |
| Did files / screenshots / messages disappear? | **High.** Could also be sync lag — check iCloud.com from a clean device first. |
| Is a known device showing up at a wildly different location? | **High.** Check Find My from a clean device. |
| Did someone tell you about a login notification you don't recognize? | **High.** Rotate credentials immediately. |

---

## Step 2 — Containment (do in this order)

### 2a. Disconnect the affected device from the network
- iPhone: Toggle Airplane Mode ON. Do not turn it off again until you complete Step 3.
- Mac: Turn off Wi-Fi. If the Mac has Ethernet plugged in, unplug it.

This stops exfiltration and remote control.

### 2b. Preserve power
- Plug the device in. Do not reboot. Do not let it die. A live device still has volatile state that reveals the attacker; a powered-off one doesn't.

### 2c. From a **different, known-clean device**, rotate your Apple ID
- Sign in to [appleid.apple.com](https://appleid.apple.com).
- Change password.
- Sign out every listed device except the clean one you're on.
- Remove unknown trusted phone numbers.
- Check and prune Family Sharing.
- Generate new app-specific passwords if you use them.

### 2d. From the clean device, rotate every high-value account
- Email (Google, Fastmail, etc.)
- GitHub
- Supabase
- Twilio
- Bank, brokerage, crypto
- Domain registrar
- Password manager (if not Apple Keychain)

For each: change password, sign out all sessions, review 2FA, add a hardware key.

### 2e. From the clean device, review connected OAuth apps
On Google, GitHub, Apple, etc. — look at every third-party app that has been granted access. Revoke anything you don't actively use.

---

## Step 3 — Eradication

### iPhone eradication path
1. On the clean Mac, use Finder (or Apple Configurator 2 if you want more control) to put the iPhone into **DFU mode** and do a **full restore**. This overwrites the firmware, not just the OS partition. Nothing persists below a DFU restore on a modern iPhone. Look up the exact button sequence for your specific model — it differs between iPhone 8 vs 11+ vs 15+.
2. When it boots, choose **Set Up as New iPhone**. **Do not restore from backup.** A backup made while compromised will carry the compromise forward.
3. Sign in with your newly-rotated Apple ID.
4. Redo every step in [`HARDENING.md`](HARDENING.md) Phase 1 before connecting to any network other than Apple's activation servers.
5. Re-install apps from the App Store one by one. Do not install anything you don't use regularly.

### MacBook eradication path
1. Back up documents only (not applications, not `~/Library`) to an external drive.
2. **Apple Menu → System Settings → General → Transfer or Reset → Erase All Content and Settings.** This is the T2/Apple-Silicon secure wipe. It is the Mac equivalent of a DFU restore for most threat models.
3. For a higher assurance wipe, put the Mac into Recovery Mode (hold power on Apple Silicon until you see options, or Cmd-R on Intel) and use Disk Utility → Erase → APFS → then reinstall macOS.
4. Set up as new. Do not migrate.
5. Redo every step in [`HARDENING.md`](HARDENING.md) Phase 2.
6. Only then reinstall the Mac Sentinel and copy your documents back.

### Router eradication path
1. Factory reset the router (usually a recessed button held for 10+ seconds).
2. Update firmware from the manufacturer's site before connecting it to anything.
3. Redo every step in [`HARDENING.md`](HARDENING.md) Phase 3.
4. If the router is ISP-owned and you suspect firmware-level compromise, ask for a replacement unit.

---

## Step 4 — Escalation

Use these resources. They are appropriate, free or low-cost, and they exist for exactly this situation.

### Access Now Digital Security Helpline
- https://www.accessnow.org/help/
- Free, 24/7, confidential.
- Intended for journalists, activists, and at-risk individuals. If you are being targeted by a capable adversary, you qualify.
- They will do real forensic triage with you.

### Apple Support
- https://support.apple.com
- If you got an **Apple Threat Notification**, Apple's documentation points to specific escalation paths.
- For ordinary account compromise, walk through Apple Support → Apple ID → "I think my Apple ID has been compromised."

### EFF (Electronic Frontier Foundation) Surveillance Self-Defense
- https://ssd.eff.org
- Reference material, not incident response, but useful background for ongoing risk.

### Law enforcement (Ohio, USA)
- **FBI IC3** ([ic3.gov](https://www.ic3.gov/)) — Internet Crime Complaint Center. File a report for any computer-crime incident. Even if they don't investigate a single case, the reports feed pattern analysis.
- **Local police** — for threats involving physical proximity, stalking, or harassment.
- **Ohio Attorney General — Identity Theft Unit** if financial identity theft is involved.
- See also [`LEGAL.md`](LEGAL.md) for what you can and cannot present as evidence.

### Things to have ready when you call any of the above
1. A **timeline** of events with exact timestamps (SHIELD's journal export handles this).
2. **Screenshots** and / or the Sentinel signed JSON export.
3. Your **Apple ID email**, any account IDs that were compromised.
4. Device **serial numbers**.
5. A concise, factual **narrative** — what, when, where, who. Do not speculate about the attacker's identity unless you genuinely know it. Investigators prefer "someone" over a wrong guess.

---

## Step 5 — Post-incident

After the devices are rebuilt and the accounts are rotated:

1. **Leave the Mac Sentinel running 24/7** going forward.
2. **Schedule a weekly hardening check** in the PWA. It takes 5 minutes and catches drift.
3. **Put your recovery keys somewhere physical and safe** — FileVault recovery key, iCloud recovery key, security key backup, password manager emergency kit.
4. **Assume the attacker learned things** about you during their window of access (contacts, messages, photos, calendar). Warn close contacts out-of-band if appropriate. Change anything they may have seen that is still sensitive.
5. **Do not publicly discuss the incident** until the eradication phase is complete and your new accounts are secured. Public discussion tips off the attacker and complicates any future investigation.
6. **Write a post-mortem for yourself**, in SHIELD's journal. What did they exploit? What did you miss? What would you do differently? This is how this kind of thing becomes survivable instead of recurrent.

---

## What NOT to do

- ❌ **Do not attempt to trace, deanonymize, or retaliate against the attacker.** This is illegal (see [`LEGAL.md`](LEGAL.md)) and dangerous. Your job is defense, not offense. Leave offense to law enforcement.
- ❌ **Do not install random "anti-hacker" apps** from the App Store. Most are scams. Stick to Apple's first-party hardening.
- ❌ **Do not pay anyone who contacts you claiming they can "fix" it**, especially not anyone who reaches out first. Legitimate help does not cold-call.
- ❌ **Do not reuse any password** that was in use during the window of compromise. Rotate all of them.
- ❌ **Do not restore from a backup made during the window of compromise.**
- ❌ **Do not keep using the compromised device "just for a few more days."** Every hour is more exfiltration.
