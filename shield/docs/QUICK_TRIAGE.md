# Quick Triage Playbook

A short, ordered checklist for short-window device triage when full cleanup will happen the next day. Not a replacement for full lockdown or professional forensics. Buys time, no more.

If any step surfaces a Configuration Profile, MDM enrollment, unknown LaunchDaemon, or `/etc/hosts` modification — **stop, photograph the screen with a separate camera, do not modify further until forensic guidance is obtained.** Destroying evidence in panic is the most common mistake in incident response.

---

## 1. Reduce attack surface (5 min)

- [ ] Mac: lid closed, do not reopen until step 2 is staged.
- [ ] iPhone: airplane mode (Settings → Cellular off, Wi-Fi off).
- [ ] Faraday containment for both devices if available; foil-lined metal tin acceptable for short windows.
- [ ] Apply same to any other radio-bearing device (smartwatch, AirTag, tablet).

## 2. Mac sweep (30 min)

In a location with no overlap to the suspected hostile network:

- [ ] `cd <repo-root>`
- [ ] `sudo bash shield/sweep.sh > ~/Desktop/sweep-$(date +%Y%m%d-%H%M).txt`
- [ ] Open report. Search for `[FINDING]`.

For each finding type:

| Finding | Action |
| --- | --- |
| Configuration Profiles present | Screenshot Settings → Privacy & Security → Profiles. Then `sudo profiles remove -identifier <id>`. Reboot. |
| MDM enrollment via DEP | **Stop.** Power down. Plan factory reinstall — see `MAC_LOCKDOWN_MAX.md` Phase 1. |
| Unknown LaunchAgents/Daemons | Re-run `sudo bash shield/sweep.sh --quarantine`. Reboot. Re-verify. |
| `/etc/hosts` non-loopback entries | Back up current file. Restore default loopback-only contents. |
| Unknown sudoers files | `sudo rm /etc/sudoers.d/<name>`. Verify with `sudo visudo -c`. |
| Stalkerware path present | Quarantine via `--quarantine`. Do not search for the product name on the same device. |
| Sharing services active (SSH, ARD, etc.) | `sudo launchctl disable system/<service>`; `sudo launchctl bootout system/<service>`. |

## 3. iPhone hardening (15 min)

On the iPhone (still airplane mode acceptable):

- [ ] Settings → Privacy & Security → Lockdown Mode → Turn On & Restart.
- [ ] Settings → General → VPN & Device Management → remove every non-self-installed Configuration Profile and MDM enrollment.
- [ ] Settings → Screen Time → Content & Privacy Restrictions → Off. Inability to disable, or unknown Screen Time passcode, indicates compromise — schedule factory reset.
- [ ] Settings → Face ID & Passcode → Allow Access When Locked → all toggles off. USB Accessories → Off.
- [ ] Settings → Accessibility → Voice Control / Switch Control / Back Tap → Off.
- [ ] Settings → Bluetooth → forget all paired devices, then Off.
- [ ] Settings → Notifications → Focus → remove every Focus the operator did not author.
- [ ] Settings → General → AirDrop → Receiving Off.

## 4. Overnight posture

Acceptable arrangements (best to worst):

1. Operator stays at alternate location. Devices powered down, Faraday-bagged.
2. Operator at primary location. Devices powered down, Faraday-bagged, isolated from sleeping area.
3. Operator at primary location. Devices powered down, out of arm's reach.

Any arrangement requires powered-down state. Devices do not enter the sleeping area in a powered state.

## 5. Next-morning sequence

Pre-write the sequence on paper, not on a device:

- Contact Access Now Digital Security Helpline (`https://www.accessnow.org/help/`) — see `SOMEONE_ELSE_NEEDS_TO_LOOK.md` for intake guidance.
- File FBI IC3 report (`https://www.ic3.gov`).
- Begin full Mac wipe + reinstall per `MAC_LOCKDOWN_MAX.md` Phase 1 (or schedule).

## 6. Negative actions during this window

- No attempts at attacker identification.
- No public posting about the incident.
- No contact with suspected actors.
- No restoration from any backup.
- No iCloud sign-in on new devices until Apple ID is rotated and hardware-key 2FA enrolled.
- No deletion of the sweep report — it is evidence.

---

This procedure does not produce a verifiably clean device. It reduces the active attack surface for a short window. Verifiable cleanup requires factory reinstall and/or professional forensic imaging.
