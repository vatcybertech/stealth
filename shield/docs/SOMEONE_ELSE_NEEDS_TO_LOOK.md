# Someone Else Needs To Look

You cannot diagnose a compromised device from inside the compromised device. Every tool you'd use to investigate runs on the device the attacker controls. They can hide from any inspection you do. This page is the runbook for handing the problem to people whose job this is.

---

## The order

1. **Access Now** (free, today)
2. **Preserve evidence** (today)
3. **FBI IC3** (this week)
4. **State AG cybercrime unit** (this week)
5. **Local victim advocate** (this week)
6. **Digital forensics firm** (within two weeks if you can afford it)
7. **Attorney** (after you have a forensics report)

---

## 1. Access Now Digital Security Helpline

**`https://www.accessnow.org/help/`**

Free. 24/7. Multilingual. They specialize in targeted individuals, civil-society activists, journalists, and stalking victims facing sophisticated threats. They will:

- Triage your case (often within hours).
- Conduct remote forensic checks (they can analyze sysdiagnose archives, iTunes backups, and other artifacts you ship them).
- Refer you to MVT (Mobile Verification Toolkit, the same tool Citizen Lab and Amnesty use to find Pegasus).
- Refer you to qualified local resources.

### What to send them when you reach out

Use this script (paste into their intake form, edit for your situation):

> I am a U.S. resident in [state]. I am being targeted by what I believe is sustained intrusion into my Apple ID, MacBook, and iPhone. The pattern is persistent: I have factory-reset the iPhone, switched to a new Apple ID, and replaced the device. The only thing I held constant was my phone number, and the attacker re-established access immediately afterward.
>
> Observations include: greyed-out settings I cannot change, deleted system alerts, screen overlays, accessibility features (Voice Control, Braille, Bluetooth) being used as control surfaces, and notification suppression.
>
> I have read your guidance and would like:
> 1. Triage of my situation.
> 2. Forensic analysis of an iTunes backup of my iPhone (I can produce one on request).
> 3. Guidance on whether commercial spyware is in scope.
> 4. Referral to a U.S.-qualified forensics professional if appropriate.
>
> I have an FBI IC3 report number [pending / number]. I have local law enforcement engagement [yes / no]. I am willing to ship a sysdiagnose, iTunes backup, or other artifacts.

### Before you write to them

- Make a sysdiagnose on your iPhone: hold both volume buttons + side button for ~2 seconds, release. Wait 10 minutes. Settings → Privacy & Security → Analytics & Improvements → Analytics Data → look for "sysdiagnose_*". You can share via Files / AirDrop to a clean Mac.
- Make an iTunes backup on a clean Mac: connect via cable, Finder → your iPhone → Back Up Now → **encrypt the backup**, password = something long random in your password manager. **Encrypted iTunes backups contain Health, Keychain, and call history that unencrypted ones do not** — this matters for forensics.

---

## 2. Preserve evidence

Before changing anything else, capture state. The attacker's move when you start cleaning is to delete evidence.

### What to capture, where to put it

Capture to an **encrypted external USB drive** (FileVault-encrypted APFS volume, or a VeraCrypt container). Never to iCloud, never to email.

iPhone:
- [ ] Encrypted iTunes backup (above).
- [ ] Sysdiagnose (above).
- [ ] Screenshots of: Settings → General → VPN & Device Management; Settings → Screen Time → Content & Privacy Restrictions; Settings → Privacy & Security → Profiles; Settings → Notifications → Focus list; Settings → Accessibility → Voice Control / Braille / Switch Control state.
- [ ] Photos (with a separate camera, not connected device) of any visible screen overlay or anomaly when it occurs.

Mac:
- [ ] Time Machine backup to the encrypted drive.
- [ ] Output of `shield/audit.sh` (see that script).
- [ ] Output of `system_profiler -detailLevel full > ~/Desktop/macprofile.txt`.
- [ ] Copy of `/Library/LaunchAgents`, `/Library/LaunchDaemons`, `~/Library/LaunchAgents` directories (zip them).
- [ ] Output of `sudo profiles list -all`.
- [ ] Output of `last -100`, `who`, `lsof -nP -iTCP -sTCP:LISTEN`.

Account-level:
- [ ] Apple ID activity download: appleid.apple.com → Data & Privacy → Get a copy of your data → request all categories. Apple emails you a download link in 1–7 days.
- [ ] Google takeout (if used).
- [ ] Carrier call detail records — request in writing from carrier.

### Chain-of-custody hygiene

- Photograph the evidence drive serial number.
- Write hash (`shasum -a 256`) of every file before handing to anyone, store hashes separately.
- Keep a contemporaneous log: date, time, what you observed, what you captured, file names, hashes.
- Don't open evidence files except on a known-clean machine. Once opened, mtime changes — preserve originals read-only.

---

## 3. FBI IC3

**`https://www.ic3.gov`**

File a report. Even if no agent calls, you have created an official record, which:

- Establishes the timeline for any later legal action.
- Increases the case's visibility if FBI's automated triage detects pattern (e.g., other reports from same state with same techniques).
- Required by some attorneys before they'll take a civil case.

What to include:
- A timeline of incidents with dates and what you observed.
- A list of compromised accounts/devices and rebuild attempts.
- Phone number / IMEI / Apple ID / IP addresses (yours, not theirs — you don't have theirs).
- A statement that you have professional forensic analysis pending (Access Now / paid firm).
- Any IP addresses, account names, or contact info you have for the suspected attacker, even if speculative.

### Federal statutes that may apply

- 18 USC 2261A (cyberstalking)
- 18 USC 1030 (Computer Fraud and Abuse Act)
- 18 USC 2511 (interception of electronic communications)
- 47 USC 223 (telecommunications harassment)

You don't need to know which applies; the FBI sorts that.

---

## 4. State AG / state cybercrime unit

**Ohio:** `https://www.ohioattorneygeneral.gov` → Consumer Protection / Cybercrime. File the same report.

Ohio has the Bureau of Criminal Investigation (BCI) Cyber Crimes Unit which handles cases too small for FBI but too technical for local PD.

---

## 5. Local victim advocate

Every U.S. county has a victim services office. They are free, confidential, and trauma-informed. They can:

- Help file civil protection orders (CPOs) including against unknown actors ("John Doe" CPOs are possible in some jurisdictions).
- Coordinate with police and prosecutor's office.
- Refer you to therapists who specialize in stalking trauma.
- Provide moral and logistical support.

Find yours: search "[county name] victim services."

National backstop: **National Center for Victims of Crime** (`https://victimsofcrime.org`), and for stalking specifically: **Stalking Prevention, Awareness, and Resource Center (SPARC)** at `https://www.stalkingawareness.org`.

---

## 6. Digital forensics firm

You pay for this. Cost: ~$2,000–$10,000 for a one-shot iPhone + Mac analysis. Worth it if your case has reached the level of "I'm spending money fighting this anyway and I want a written report I can hand to a lawyer."

Suggested firms (no affiliation, do your own due diligence):
- **TrustedSec** (Strongsville, OH — local to Ohio).
- **NCC Group** (national, expensive, top-tier).
- **Mandiant / Google Cloud** (expensive, top-tier, may decline cases too small for them).
- **Citizen Lab** (Toronto, free for civil-society cases, but very selective).
- Smaller boutiques: search "digital forensics expert witness [your city]."

What to ask for:
- Forensic image of the iPhone (encrypted iTunes backup analysis).
- Forensic image of the Mac (full disk image to write-blocked drive, then analysis).
- Network artifact analysis (DNS history, connection logs).
- Accounts artifact analysis (auth events from Apple ID, Google, etc.).
- A written report suitable for use in legal proceedings.

---

## 7. Attorney

After forensics gives you a written report. The lawyer's job is to:

- File civil suit against the attacker (if identified) for damages.
- Subpoena ISPs, carriers, and platforms (Apple, Google, Facebook) to turn over IPs, account info, and access logs that you cannot obtain yourself.
- Request a civil protection order against named or unknown actors.
- Coordinate with criminal prosecutors.

Look for: civil litigation attorney with experience in stalking, harassment, or cyber cases. EFF maintains a list of attorneys who handle these matters: `https://www.eff.org`.

Many attorneys take cyberstalking cases on contingency or sliding scale, especially if there's a clear corporate defendant (e.g., your carrier failed to prevent SIM-swap and is liable).

---

## What you do not do

- **Do not contact the attacker directly.** Even to "make them stop." It compromises the criminal case and may lead to retaliation.
- **Do not hack back, attempt to identify them yourself, or hire a "private investigator" who promises to hack back.** Felony under CFAA. You become the criminal.
- **Do not post about the case publicly** while it's active. Reduces your information advantage.
- **Do not delete evidence to "feel safer."** Capture, then clean.

---

## A reasonable timeline

- **Day 0:** Read this. Decide you're calling Access Now today. Capture iPhone sysdiagnose + encrypted iTunes backup before you change anything.
- **Day 0–3:** Access Now triage call. They tell you whether commercial spyware analysis (MVT) makes sense.
- **Day 1:** File IC3 report. File state AG report.
- **Day 3–7:** Reach out to local victim services. Reach out to a forensics firm for an estimate.
- **Day 7–14:** Forensics engagement begins. Meanwhile, you execute `IPHONE_LOCKDOWN_MAX.md` and `MAC_LOCKDOWN_MAX.md` on the **rebuilt** devices (preserve the originals as evidence).
- **Day 14–30:** Forensics report delivered. Decide on attorney engagement.
- **Day 30+:** Decoupling per `PHONE_NUMBER_DECOUPLING.md` Path A. New normal.

You will not feel safe at day 30. You may feel safe at day 90, when the rebuild has held and the documentation is complete and you have a lawyer who knows the file. The job between now and then is to make every step a real human can verify, not one you have to hold in your own head.
