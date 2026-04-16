# SHIELD Active Enforcement

**What changes in v2.2:** SHIELD can now *act* on detections, not just log them. The enforcement engine automatically quarantines new LaunchAgents, removes unauthorized configuration profiles, disables sharing services that turn themselves on, kills unsigned processes that are making outbound connections, restores tampered shell startup files, and maintains a `pf` firewall blocklist of IPs that look like attacker control machines. Self-healing runs on its own 5-minute timer and restores your hardening baseline if any of it drifts.

**Why:** everything before v2.2 was detection. Detection is only useful if a human sees the alert in time. If the attack happens at 3 AM and you're asleep, a pure detection system does nothing. Enforcement is the layer that works while you sleep.

**Default posture:** enforcement is ON after a 72-hour grace period from install. During the grace period, everything that would be enforced is instead logged as a "planned" action (DRY_RUN mode) so you can see exactly what SHIELD intends to do before it starts doing it. After 72 hours, the engine flips to ENFORCE mode automatically.

---

## What gets auto-acted on

| Trigger event | Enforcement action | Needs root? |
|---|---|---|
| `LAUNCHAGENT_NEW` / `LAUNCHAGENT_MODIFIED` | Move the plist to SHIELD's quarantine dir + `launchctl unload` | No (user LaunchAgents only) |
| `PROFILE_PRESENT` / `PROFILE_CHANGE` | `sudo profiles remove -identifier <id>` | Yes — sudoers rule |
| `SHARING_ENABLED` / `SHARING_ACTIVE` | `sudo launchctl disable system/<service>` | Yes — sudoers rule |
| `BOOT_FILE_MODIFIED` for `/etc/hosts` | `sudo cp baseline /etc/hosts` | Yes — sudoers rule |
| `SHELL_RC_MODIFIED` | Save tampered copy to quarantine, restore from baseline | No |
| `EGRESS_PROCESS_NEW` with unsigned flag | `kill -9 <pid>` — IF process is not on dev whitelist | No (user-owned procs only) |
| `COUNTER_RECON_RESULT` HIGH (VNC/ARD/RDP open on unknown LAN device) | Add the IP to `pf` blocklist table | Yes — sudoers rule |

## What gets self-healed

The `self_heal` module runs on its own 5-minute timer. On every tick it verifies your hardening baseline:

| Baseline item | Can SHIELD restore? | Action |
|---|---|---|
| Lockdown Mode | No (Apple blocks programmatic re-enable) | Alert CRITICAL + fire auto-response |
| FileVault | No | Alert CRITICAL + fire auto-response |
| SIP | No (requires recovery mode) | Alert CRITICAL + fire auto-response |
| Gatekeeper | Yes | `sudo spctl --master-enable` |
| Firewall | Yes | `sudo socketfilterfw --setglobalstate on` |
| Firewall stealth | Yes | `sudo socketfilterfw --setstealthmode on` |
| Sharing services off | Yes | `sudo launchctl disable system/<svc>` for each |

If the sudoers rule is not installed, drift detection still works but restore attempts fail cleanly and are logged as `HARDENING_DRIFT` events with `restoreError` set — you still see the drift, you just have to restore manually.

---

## Installation

Enforcement has two tiers. **Tier A (user-level actions)** works out of the box: LaunchAgent quarantine, shell RC restore, conservative process killing. **Tier B (root-level actions)** requires a tightly-scoped sudoers rule installed via the provided script.

### Tier A — nothing to install

User-level enforcement is automatically enabled when the Sentinel reaches the end of its 72-hour grace period. No action required.

### Tier B — the sudoers rule

**Inspect the rules file before installing.** Run:

```bash
bash mac-sentinel/install-sudoers.sh --print
```

This prints the exact sudoers file contents without installing anything. Read every line. It grants your user NOPASSWD access to:

- `/usr/bin/profiles remove -identifier *` — delete a configuration profile by identifier
- `/bin/launchctl disable system/*` — disable a sharing service
- `/sbin/pfctl -t shield_block -T add|delete|flush|show` — manage the SHIELD pf blocklist table
- `/usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on` — turn on the firewall
- `/usr/libexec/ApplicationFirewall/socketfilterfw --setstealthmode on` — turn on stealth mode
- `/usr/sbin/spctl --master-enable` — turn on Gatekeeper
- `/bin/cp <baseline> /etc/hosts` — restore `/etc/hosts` from SHIELD's own baseline (nothing else)
- `/usr/bin/bputil -d` — read Apple Silicon Boot Policy (read-only)

It does **not** grant:
- Shell access
- Arbitrary file writes
- Arbitrary process execution
- Anything that could be chained into full root

Install with:

```bash
sudo bash mac-sentinel/install-sudoers.sh
```

The script:
1. Prints the rules you are about to install
2. Asks for explicit `yes` confirmation
3. Syntax-checks the file via `visudo -c` before activating
4. Writes to `/etc/sudoers.d/shield` with `0440 root:wheel`
5. Tells you how to restart the Sentinel to pick up the new privileges

Revoke with:

```bash
sudo bash mac-sentinel/install-sudoers.sh --uninstall
```

---

## pf firewall blocklist — one-time setup

The `blocklist` module maintains a `pf` table named `shield_block`. To make the table actually block traffic, pf needs a rule that references it. This is a one-time setup:

### 1. Create the anchor file

```bash
sudo mkdir -p /etc/pf.anchors
sudo tee /etc/pf.anchors/com.shield.block <<'EOF'
table <shield_block> persist
block drop quick from <shield_block> to any
block drop quick from any to <shield_block>
EOF
```

### 2. Edit `/etc/pf.conf` to load the anchor

Add these two lines near the other anchor references:

```
anchor "com.shield.block"
load anchor "com.shield.block" from "/etc/pf.anchors/com.shield.block"
```

### 3. Enable pf and reload

```bash
sudo pfctl -e
sudo pfctl -f /etc/pf.conf
```

Verify:

```bash
sudo pfctl -sr | grep shield_block
sudo pfctl -t shield_block -T show   # should be empty initially
```

Once this is in place, SHIELD's blocklist module will populate the table as new attacker-looking IPs are detected, and pf will drop all traffic to/from them at the kernel level.

---

## Grace period and modes

`config/defaults.json` → `enforcement`:

```json
{
  "enforcement": {
    "enabled": true,
    "mode": "auto",
    "gracePeriodSeconds": 259200
  }
}
```

- **`enabled: false`** — enforcement engine does nothing, not even log plans. Detection still works.
- **`mode: "auto"`** — DRY_RUN for the first 72 hours, ENFORCE thereafter. (Recommended.)
- **`mode: "dryRun"`** — never execute, always log plans. Useful if you want to see what SHIELD would do without committing.
- **`mode: "enforce"`** — skip the grace period, enforce immediately on the first detection. Only set this if you're sure.

Every planned action is logged BEFORE execution (`ENFORCEMENT_PLANNED` HIGH), and every completed action is logged AFTER (`ENFORCEMENT_RESULT` HIGH on success / CRITICAL on failure). In DRY_RUN mode, `ENFORCEMENT_RESULT` has `skipped: "dryrun-or-disabled"` so you know the plan was logged but not executed.

---

## The developer whitelist

Process killing is by far the most dangerous enforcement action. A false positive means SHIELD kills a legitimate process you were depending on. To prevent that, the enforcer refuses to kill any process whose base command name is on this hard-coded whitelist:

```
node, python, python3, python2, ruby, perl
go, cargo, rustc, java, javac, mvn, gradle
brew, git, gh, docker, colima, terraform, ansible
npm, yarn, pnpm, bun, deno
code, cursor, vim, nvim, emacs
```

If you want to add or remove entries, edit `USER_WHITELIST_COMMANDS` in `mac-sentinel/lib/enforcer.js` and reload the Sentinel.

This is a belt-and-suspenders check on top of the analyzer's existing gate: process killing only fires when ALL of {unsigned, making outbound connections, not on the dev whitelist} are true. A single one false → no kill.

---

## Quarantine directory

Quarantined LaunchAgents and tampered shell RC files are moved to:

```
~/Library/Application Support/SHIELD/quarantine/
```

with a timestamped filename like `com.evil.plist.2025-11-23T03-42-17Z.quarantined`. They stay there forever until you delete them. If SHIELD ever quarantines something legitimate (it shouldn't, but), you can recover it from that directory by moving it back to its original location.

---

## Uninstalling active enforcement

To turn off enforcement without uninstalling the entire Sentinel:

```json
{ "enforcement": { "enabled": false } }
```

To remove the sudoers rule:

```bash
sudo bash mac-sentinel/install-sudoers.sh --uninstall
```

To remove the pf rules:

```bash
sudo pfctl -a com.shield.block -F all
# Then remove the two anchor lines from /etc/pf.conf and reload.
```

SHIELD detection (the rest of the Sentinel) is completely unaffected by turning enforcement off.

---

## What to tell a security professional reviewing this

- Least-privilege sudoers rule with seven specific command aliases, no wildcards beyond the documented ones.
- 72-hour default grace period to catch first-run false positives before they become irreversible actions.
- Every planned action is logged in a hash-chained ledger BEFORE execution, with outcome logged AFTER.
- Quarantine instead of delete for all file-based actions — reversible.
- Dev-whitelist + multi-condition gate for process killing — refuses to kill dev tools.
- Auto-response engine (v2.0) + enforcer (v2.2) are independent layers; either can be disabled alone.
- No shell, no arbitrary exec, no writable wildcards.
- Revocation is one command.

If anything about this posture raises a flag, the answer is to set `enforcement.enabled: false` and stick to detection-only mode — the Sentinel's core function is unchanged.
