# SHIELD Honeypots — active deception

**In v2.1+, SHIELD plants tempting-looking decoy files at known paths on your Mac and monitors them for read, modify, and delete access.** Real users and legitimate software never touch these files. Any access to any of them is essentially guaranteed to be an attacker reconnoitering your filesystem. Detection is high-signal, near zero false-positive.

This document explains what SHIELD creates, what the alerts mean, how to add an optional external DNS canary that fires even when the attacker is long gone, and how to enable an advanced SMB honeypot share (with a clear warning about the tradeoff).

---

## What gets created

On first run of the Sentinel (or at `--setup` time if you run setup before ever running the scan loop), SHIELD's honeypots module plants five files:

| Path | What it looks like | Severity on access |
|---|---|---|
| `~/Desktop/.credentials_backup` | Hidden file, syntactically valid fake OpenSSH ed25519 private key, plus a fake API token | CRITICAL |
| `~/Desktop/Recovery_Codes.txt` | Ten fake "Apple ID Recovery Codes" in the standard `xxxx-xxxx-xxxx` format | CRITICAL |
| `~/Documents/Financial_Records/tax_returns_2025.pdf` | Minimal valid PDF (opens to a blank page) | CRITICAL |
| `~/Documents/Financial_Records/bank_accounts.csv` | Plausible CSV of fake checking, savings, brokerage balances | CRITICAL |
| `~/Documents/Financial_Records/passwords_backup.txt` | Plausible plaintext of fake credentials for Gmail, Apple, Chase, GitHub, AWS, and VPN | CRITICAL |

Each file has `0600` permissions so only your user can read them.

You do not need to do anything to create these — SHIELD creates them the first time the Sentinel runs. You will see them on your Desktop and in a new `~/Documents/Financial_Records/` directory.

**Do not touch them yourself.** That is the entire point. If you open one to "see what's inside," you will fire a CRITICAL honeypot access event in your own ledger. If you want to look at them, read the source bytes of this directory's files in the SHIELD repo — the content is in `mac-sentinel/lib/honeypots.js`.

---

## What triggers an alert

The honeypot collector polls each file on every scan cycle (30 seconds normal, 5 seconds aggressive) and records its size, SHA-256, mtime, and atime. The analyzer emits:

| Event | Trigger | Severity |
|---|---|---|
| `HONEYPOT_ACCESSED` | The file's atime advanced while mtime and hash stayed the same. Someone read the file. | CRITICAL |
| `HONEYPOT_MODIFIED` | The hash changed. Someone wrote to the file. | CRITICAL |
| `HONEYPOT_REMOVED` | The file is gone. Someone deleted it. | CRITICAL |

`HONEYPOT_ACCESSED` is by far the most likely real-world signal. An attacker browsing your filesystem for things to exfiltrate will see `bank_accounts.csv` and `passwords_backup.txt` and they will open them. That's what honeypots are for.

### False positives

- **macOS Spotlight indexing.** When Spotlight first encounters a new file it may read it to build a preview. This reads the file and will advance atime on filesystems that track atime. SHIELD's honeypot files are plain text (or an empty PDF) and Spotlight indexing typically completes within minutes of file creation. If you see HONEYPOT_ACCESSED events in the first 10 minutes after install, this is almost certainly Spotlight and can be ignored. Events after that window should be treated as real.
- **QuickLook preview.** Tapping the Space bar on a file in Finder previews it and reads the contents. If you hit Space on a honeypot file while looking at your Desktop, you'll fire an event on yourself. Don't hit Space on the decoys.
- **Time Machine / backup tools.** Some backup software reads files to hash them. If you run Time Machine or another backup tool, you may see periodic HONEYPOT_ACCESSED events at your backup cadence. Whitelist the backup app by leaving it alone, or add its process name to the whitelist via `state.whitelist.honeypotReaders` (coming in v2.2).
- **APFS atime granularity.** APFS with `strictatime` off does not always update atime on every read. This means some legitimate reads won't fire HONEYPOT_ACCESSED. This is a false-negative risk, not a false positive — it means the honeypot is weaker than ideal, not that it fires on legitimate activity. SHIELD additionally tracks `mtime` and `hash` to catch the cases where atime is unreliable.

### Quieting the Spotlight burst on install

If the initial Spotlight indexing burst is noisy, you can tell Spotlight not to index the honeypot directory:

```bash
sudo mdutil -i off ~/Documents/Financial_Records
```

This prevents Spotlight from touching the file on install, which eliminates the initial atime advance and the false-positive window.

---

## Adding a DNS canary (external alerting)

A DNS canary is a unique subdomain that you register with a free canary-token service (e.g., [canarytokens.org](https://canarytokens.org)). When any HTTP or DNS request is made to that subdomain, the canary service emails you. If an attacker exfiltrates `passwords_backup.txt`, tries to use the fake credentials, and connects to the fake "webhook URL" embedded in the file, your canary fires — **completely independently of SHIELD**. This matters because it catches exfiltration even if SHIELD is offline, wiped, or compromised.

### Setup

1. Open [https://canarytokens.org](https://canarytokens.org) in a private browser window from a clean device.
2. Choose a token type: **Web bug / URL token** is the most versatile.
3. Enter an email you control (ideally a privacy-preserving alias — ProtonMail, Hide My Email via Apple, Fastmail alias, etc.). Do not use your primary address.
4. Enter a memo so you remember what this token is for: `SHIELD honeypot passwords_backup.txt`.
5. The service gives you back a URL like `https://abc123def.canarytokens.com`. Copy it.
6. Open `shield/mac-sentinel/config/defaults.json` and add (or set):

    ```json
    "honeypots": {
      "canaryUrl": "https://abc123def.canarytokens.com"
    }
    ```

7. Restart the Sentinel:

    ```bash
    launchctl unload ~/Library/LaunchAgents/com.shield.sentinel.plist
    launchctl load ~/Library/LaunchAgents/com.shield.sentinel.plist
    ```

8. The next scan cycle the honeypots collector will detect that the canary URL changed and rewrite the decoy file contents with the new URL embedded. From that moment on, any attacker who actually *uses* the fake credentials and hits the embedded webhook will trigger the canary.

### How the canary is embedded

The canary URL is silently included in the decoy content in places a casual inspection will not notice but an automated credential harvester will dutifully record and try:

- `passwords_backup.txt` includes a comment line `# Webhook for sync: https://...canarytokens.com`
- `bank_accounts.csv` includes a "# Internal webhook (do not share): https://..." trailer
- `.credentials_backup` includes the canary URL inside a fake base64 block pretending to be the private-key body
- `Recovery_Codes.txt` says "If lost, contact support via https://..."

An attacker harvesting the file to extract credentials will see a URL that looks like a webhook, a support endpoint, or a sync service, and many of them will probe it to see what it responds with. That probe is the canary trigger.

### What fires when

The canary triggers on:
- Any HTTP GET / POST / HEAD request to the canary URL
- Any DNS resolution of the canary's hostname
- Any IP-level connection to the canary's IP

Your email inbox gets a notification with the source IP, timestamp, user-agent, and optionally GeoIP. That information, combined with SHIELD's own ledger, is exactly what you hand to Access Now or the FBI IC3 if it ever comes to that.

### Rotating the canary

Canary URLs are long-lived — you do not need to rotate them unless one fires and you want a new one. To rotate: follow the setup steps again with a new token, update `config/defaults.json`, and restart the Sentinel. The decoy file contents will be rewritten with the new URL on the next scan cycle.

---

## The advanced SMB honeypot — explicitly optional

The original v2.1 brief asked for a real SMB share called `Financial_Records` exposed to the local network, so that any device browsing your LAN sees the share name and is tempted to open it.

**SHIELD does not do this automatically** because it conflicts directly with the hardening runbook. `docs/HARDENING.md` Phase 2 Step 6 says to turn off every Sharing service on the Mac and only enable one when you actively need it. Turning on SMB file sharing reopens a real attack surface — any vulnerability in macOS's SMB server or in the underlying samba code becomes an exposed vulnerability. That is a non-trivial trade.

If you want the SMB share anyway, because your threat model weights deception heavily, here is how to set it up yourself, explicitly:

### Setup (advanced, requires admin)

1. **Weigh the tradeoff.** Enabling SMB exposes your Mac to:
    - CVEs in the macOS SMB server stack
    - Credential brute-force attempts over port 445
    - Any SMB-based lateral movement tool on your LAN
    In exchange, you gain: the attacker sees a share called `Financial_Records` with very tempting file names inside and is likely to access it before going looking for other targets.
2. **Enable File Sharing for ONE directory only.** System Settings → General → Sharing → File Sharing → On → click (i) next to File Sharing → add `~/Documents/Financial_Records` to the Shared Folders list → set permissions to **Read & Write** for a specific user account called `guest`, and set that user's account up as a Standard user with a disposable password.
3. **Make the share SMB-only.** Click Options in the File Sharing dialog → enable `Share files and folders using SMB` → disable everything else. Check the box next to the `guest` account under "Windows File Sharing."
4. **Rename the share.** Click the share in the list and rename it to `Financial_Records` (should already match, but confirm).
5. **Expose with strict network scope.** Under Options, there's no per-interface scope on macOS's SMB; the share is available on every active network interface. If you only want it on your home LAN, you need a firewall rule — use the built-in `pf` or a tool like Little Snitch to restrict inbound port 445 to your home subnet.
6. **Verify SHIELD is still watching the underlying files.** The honeypot collector already hashes the files at `~/Documents/Financial_Records/*`; making them an SMB share adds a network-visible access path but does not change the file monitoring. All HONEYPOT_ACCESSED events from SMB clients will fire as usual.
7. **Add a firewall rule to log inbound SMB connections separately.** macOS's application firewall does not do per-port rate logging; for that you want pf or a monitoring tool.

### Maintenance

- Rotate the `guest` user's password every 30 days.
- Review `launchctl list | grep smb` and `ps aux | grep smbd` occasionally to make sure only the expected processes are running.
- If you see HONEYPOT_ACCESSED events from an IP you don't recognize, you have your proof-of-access event. Export the evidence and escalate per `docs/INCIDENT_RESPONSE.md`.
- If you ever decide to turn SMB sharing off again, remember to also delete the `guest` user account.

### Recommended default

**Don't do this.** The decoy files alone are sufficient. SMB file sharing is a real attack surface that the advanced setup partially mitigates but does not eliminate, and the marginal deception value over the plain decoy files is small. The honeypot files on their own trigger when an attacker with filesystem access (which is what we're worried about) browses the Desktop or Documents directory, which they will.

The SMB version only helps if you're worried about an attacker who is on your LAN but has **not** yet achieved code execution on the Mac. That is a narrower threat model than the one SHIELD is built for.

---

## Summary

- SHIELD plants five decoy files at known paths on first run of the Sentinel. No action required.
- Any read, write, or delete of any of them fires a CRITICAL event.
- Spotlight indexing in the first ~10 minutes after install is the only plausible false positive. Disable Spotlight indexing for `~/Documents/Financial_Records` to eliminate it.
- Setting up a DNS canary via canarytokens.org gives you external alerting that continues to work even if SHIELD goes down. Takes 60 seconds.
- Enabling a real SMB share is possible but explicitly discouraged — the marginal deception value is small and the attack surface tradeoff is real.

The honeypots are your most asymmetric defense. They cost you almost nothing (five inert files) and they catch exactly the kind of attacker behavior you care about: hands-on-keyboard reconnaissance of your filesystem.
