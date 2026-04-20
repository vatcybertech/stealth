# Phone Number Decoupling

You held one constant across a full device rebuild — the phone number — and the attacker came back. The number is the foothold. This runbook detaches it.

Two paths. Pick one based on appetite.

- **Path A (high effort, max security):** new number on a new carrier, old number ported to a VoIP service for legacy reach.
- **Path B (lower effort, partial):** keep the number, harden the carrier account, strip the number from every account that uses it for auth.

Path A is the right answer if you can stomach it. Path B is what most people end up doing.

---

## Path A — Burn the number

### Step 1 — Stand up a clean number first

- [ ] Walk into a corporate store of a different carrier than your current one (T-Mobile if you're on Verizon, etc.). In person, with photo ID. Buy a new prepaid SIM with a new number. Pay cash if possible.
- [ ] Set a long random account PIN at activation.
- [ ] Set up the new number's carrier portal account from a clean device, hardware-key 2FA.
- [ ] **Do not give this number to anyone. It is for emergencies and 2FA only.**

### Step 2 — Move every account off the old number

For each account that has your old number on file (do this on a clean device, or your hardened iPhone after Phase 1 of `IPHONE_LOCKDOWN_MAX.md`):

- [ ] Apple ID → Sign-In & Security → Trusted Phone Numbers → add the new number → remove the old.
- [ ] Apple ID → Personal Information → Phone Numbers → update.
- [ ] Google account → Personal Info → Contact Info → Phone → update.
- [ ] Bank, brokerage, retirement — call each (from the new number) and update.
- [ ] Health insurance, doctors — update via portal.
- [ ] Email accounts (recovery phone) — update.
- [ ] Password manager — update.
- [ ] Every social media account — update.
- [ ] Signal — Settings → Account → Change Number → new number.
- [ ] WhatsApp — Settings → Account → Change Number.
- [ ] Telegram — Settings → Edit → Phone Number.
- [ ] iMessage / FaceTime — Settings → Messages / FaceTime → tie to email only, deselect old number.

For 2FA specifically:
- [ ] Anywhere you have SMS 2FA, switch to TOTP (Aegis on Android, Raivo or 2FAS on iOS) or hardware key.
- [ ] Audit recovery options on each account; remove SMS as recovery, prefer email + hardware key.

### Step 3 — Port the old number out (so it stops being a SIM)

- [ ] Sign up for a VoIP service: Google Voice (free, requires existing US number), JMP.chat (~$3/mo, no Google), MySudo (paid, gives you multiple numbers), Twilio (DIY).
- [ ] Port the old number into the VoIP service. Process: get a port-out PIN from old carrier → enter at VoIP service → wait 1–7 days.
- [ ] Once port completes: the old number is on VoIP. Anyone who calls/texts it reaches a VoIP inbox you can check on demand. SIM-swap is no longer possible against it.

### Step 4 — Public posture

- [ ] Update your professional profiles, business cards, CRM contact records, etc. with the VoIP-hosted old number (so old contacts still reach you) but use the new SIM number nowhere public.
- [ ] **Data brokers:** sign up for DeleteMe, Optery, or Kanary to file removal requests for your old number, addresses, and relatives' info from data brokers. They do this monthly.
- [ ] Manually remove yourself from Whitepages, Spokeo, BeenVerified, Truecaller (Truecaller especially — they crowdsource numbers from contacts, you have to opt out at truecaller.com).

---

## Path B — Keep the number, harden the carrier

This is the second-best option. Use only if Path A isn't feasible.

### Step 1 — Carrier account hardening

- [ ] Log into your carrier portal **from a clean device** (a public library Chromebook, or your hardened device from Phase 1).
- [ ] Change carrier portal password to 20+ random chars from your password manager.
- [ ] Enable hardware-key 2FA if your carrier supports it (T-Mobile and Verizon do; AT&T limited).
- [ ] Set a **port-out PIN** / account PIN. Long random. Carrier-specific names:
  - **T-Mobile:** Account PIN + Port Validation feature
  - **Verizon:** Account PIN + Number Lock
  - **AT&T:** Wireless Passcode + Wireless Account Lock (request via 611)
- [ ] **Number Lock** (Verizon) or **Port Validation** (T-Mobile) — turn ON. This prevents porting without an in-person store visit.
- [ ] Audit Authorized Users — remove anyone who shouldn't be able to call in and authorize changes.
- [ ] Audit recent SIM-swap history (most portals show this). Anything you didn't authorize → call carrier fraud line immediately.
- [ ] Disable e-SIM transfer if your carrier supports it (or set it to require in-person).
- [ ] Set up account-change email alerts to a fresh email account on a separate provider (so the alert doesn't get suppressed by an attacker who controls your primary email).

### Step 2 — Strip the number from auth

Same as Path A Step 2 — move every 2FA off SMS, every recovery off the number, every login that uses your phone number as identity.

### Step 3 — Get a clean second number for new 2FA

- [ ] Get a Google Voice / JMP / MySudo number — use it for 2FA on accounts that won't accept TOTP. Your real number stays out of these.

### Step 4 — Watch for SIM swap

- [ ] If your phone suddenly shows "No Service" with no apparent cause, that's a SIM-swap-in-progress. Call your carrier fraud line **from a different phone** immediately.
- [ ] Set a recurring weekly task to log into the carrier portal and verify SIM serial / IMEI hasn't changed.

---

## What to do if a SIM swap happens anyway

1. **From a different phone**, call the carrier's fraud number (don't use the carrier portal — that's how they got in).
2. Demand SIM port reversal and a new SIM with new ICCID, in person at a corporate store.
3. File FBI IC3 report (`https://www.ic3.gov`) — SIM swap is wire fraud.
4. File local police report.
5. File state AG complaint.
6. Request from carrier in writing: account audit, SIM history, IP logs of every login. They are required to provide this.
7. Within 72 hours of regaining the number, **rotate every password and 2FA** for every account, because the attacker had a window where SMS resets worked.
8. Consider Path A immediately afterward — you've now confirmed your number is a target.

---

## Threat that survives even Path A: SS7

SS7 is the legacy telecom signaling protocol that lets carriers route SMS and calls between each other. Bad actors with carrier-level access can intercept SMS and locate phones via SS7 anywhere, no malware on your device, no proximity needed.

- **Mitigation:** stop trusting SMS for anything. Signal/Threema for messaging. Email + hardware key for authentication. Voice calls assume someone is listening.
- **Detection:** there's no consumer way to detect SS7 interception against you. The only signal is "the attacker keeps knowing things they shouldn't" — which is your situation.

If you've done Path A and they're still ahead of you, SS7 (or a parallel commercial-spyware compromise that survived the rebuild) is the leading hypothesis. That's the point at which you call **Access Now Digital Security Helpline** (`https://www.accessnow.org/help/`) — they specifically triage telecom-level and commercial-spyware cases. Free.
