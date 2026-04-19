# Go Home Tonight

A short, ordered playbook for "make my devices safe enough to sleep with them in the same building tonight." Not a full clean-up. Buys you 8 hours so you can do the real cleanup tomorrow with daylight and a clearer head.

If at any step you find something that scares you (Configuration Profile, MDM enrollment, unknown LaunchDaemon, /etc/hosts hijack), **stop, photograph the screen with a separate camera, and call Access Now in the morning**. Do not destroy evidence in panic.

---

## 1. Stop the bleeding (5 minutes)

- [ ] **Mac:** lid down. Don't open it again until you've done step 2.
- [ ] **iPhone:** turn off cellular and Wi-Fi (Settings → Cellular → Off, Settings → Wi-Fi → Off). Or just airplane mode.
- [ ] **iPhone:** put it in a Faraday pouch if you have one. If not, double-bag it in a metal cookie tin lined with aluminum foil. Sounds silly, works fine for short periods.
- [ ] If you carry anything else with a radio (smartwatch, AirTag, kid's tablet) — same treatment.

You are now off the air. Whatever they had, they don't have right now.

## 2. The 30-minute Mac sweep

In a safe spot (coffee shop is fine, separate Wi-Fi from home, or no Wi-Fi at all — sweep doesn't need network):

- [ ] Open Terminal: `cd path/to/this/repo`
- [ ] Run: `sudo bash shield/sweep.sh > ~/Desktop/sweep-$(date +%Y%m%d-%H%M).txt`
- [ ] Wait. It takes 1–5 minutes.
- [ ] Open the output file in TextEdit. **Search for `[FINDING]`.**

For each `[FINDING]`:

- **Configuration Profiles present?** Save the report. Do not remove yet — first photograph or screenshot the System Settings → Privacy & Security → Profiles screen. Then `sudo profiles remove -identifier <id>` for each. Reboot.
- **MDM enrollment via DEP?** Stop. Tonight is not the night to fix this. Power down the Mac. Go to step 4. Tomorrow: `MAC_LOCKDOWN_MAX.md` Phase 1.
- **Unknown LaunchAgents/Daemons?** Re-run with `--quarantine`: `sudo bash shield/sweep.sh --quarantine`. Reboot. Verify they're gone.
- **/etc/hosts hijack?** Back up the current file: `sudo cp /etc/hosts ~/Desktop/hosts.malicious`. Replace with default:
  ```
  sudo tee /etc/hosts <<EOF
  ##
  # Host Database
  ##
  127.0.0.1       localhost
  255.255.255.255 broadcasthost
  ::1             localhost
  EOF
  ```
- **Unknown sudoers files?** `sudo rm /etc/sudoers.d/<name>`. Verify `sudo visudo -c`.
- **Stalkerware path present?** Quarantine via `--quarantine`. Note the name. **Don't search for it on the same Mac** — search on a clean device, since searching can tip them off.
- **Sharing services active (SSH, Remote Desktop, etc.)?** Disable each:
  ```
  sudo launchctl disable system/<service>
  sudo launchctl bootout system/<service>
  ```

## 3. iPhone — 15 minutes

Take iPhone out of Faraday pouch (still in airplane mode). On the iPhone itself:

- [ ] Settings → Privacy & Security → **Lockdown Mode** → Turn On & Restart.
- [ ] After reboot, Settings → General → **VPN & Device Management** → delete every Configuration Profile and MDM enrollment.
- [ ] Settings → Screen Time → Content & Privacy Restrictions → Off (if you don't know the Screen Time passcode and didn't set it: this is a smoking gun, plan a factory reset tomorrow).
- [ ] Settings → Face ID & Passcode → Allow Access When Locked → turn OFF every toggle. Set USB Accessories → OFF.
- [ ] Settings → Accessibility → Voice Control → Off. Switch Control → Off. Touch → Back Tap → Off.
- [ ] Settings → Bluetooth → Off. Forget every paired device under it first.
- [ ] Settings → Notifications → Focus → delete every Focus you don't recognize.
- [ ] Settings → General → AirDrop → Receiving Off.

Leave Wi-Fi off (your decision per earlier). Leave Bluetooth off. Cellular only when needed.

## 4. Decide where to sleep

Three honest options, ranked:

**A. Stay somewhere else tonight.** Hotel, friend, family. Devices powered fully off, in a Faraday pouch, in your bag. Best option. Sleep wins fights.

**B. Go home, devices stay off and Faraday-bagged in another room** (kitchen / garage / car). You sleep without them within reach.

**C. Go home, devices powered down and out of arm's reach** (across the room, drawer closed). Acceptable but worst of the three.

Whichever you pick: the iPhone and Mac do not enter the bedroom powered on tonight.

## 5. Set tomorrow's first move (write it down before you sleep)

On a piece of paper, not on the device:

```
06:00 — wake
07:00 — coffee, no devices
08:00 — write to Access Now (https://www.accessnow.org/help/)
        use the script in SOMEONE_ELSE_NEEDS_TO_LOOK.md
09:00 — file IC3 report (https://www.ic3.gov)
10:00 — full Mac wipe + reinstall per MAC_LOCKDOWN_MAX.md Phase 1
        (or schedule it for the next free day)
```

You are tired. Your judgment is degraded. Tomorrow's-you needs a written instruction so today's-you can stop holding it all in their head.

## 6. What you do NOT do tonight

- Don't try to identify the attacker.
- Don't post about it publicly.
- Don't contact anyone you suspect.
- Don't restore from any backup ("clean" is an unverified claim until forensics says so).
- Don't sign back into iCloud on any new device until the Apple ID is rotated and hardware-key-2FA is on (`PHONE_NUMBER_DECOUPLING.md` step 2).
- Don't delete the sweep report — that's evidence.
- Don't sleep with the phone next to your head.

---

## What this buys you

This does not make the device verifiably clean. It makes it *quieter than it was an hour ago*, and it gets you to morning. Real cleanup is a daylight job with a fresh head, the full lockdown runbooks, and a human (Access Now) on the other end of a chat.

Sleep is a defensive measure. Don't skip it.
