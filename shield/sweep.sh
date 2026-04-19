#!/usr/bin/env bash
# SHIELD — aggressive sweep. Finds and quarantines the most common
# persistence and stalkerware artifacts on macOS.
#
# THIS DOES NOT GUARANTEE A CLEAN MACHINE. The only guarantees come from
# wiping and reinstalling from Recovery, or from a professional forensic
# image. This script is high-coverage self-triage.
#
# Usage:
#   sudo bash shield/sweep.sh                  # detect only, write report
#   sudo bash shield/sweep.sh --quarantine     # detect AND move suspicious
#                                              # items to /var/SHIELD-quarantine/
#   sudo bash shield/sweep.sh --baseline       # write hash baseline of system
#                                              # binaries for future comparison
#   sudo bash shield/sweep.sh --verify         # compare to last baseline
#
# Output:
#   /var/SHIELD-quarantine/sweep-<timestamp>/  (per-run directory)
#     report.txt                               (full findings)
#     report.sha256                            (integrity hash of report)
#     quarantined/                             (moved items, if --quarantine)
#     baseline.sha256                          (if --baseline)

set -uo pipefail

if [[ "$(uname)" != "Darwin" ]]; then
  echo "shield/sweep.sh is macOS-only."
  exit 1
fi

if [[ $EUID -ne 0 ]]; then
  echo "Must run as root: sudo bash $0 $*"
  exit 1
fi

MODE="detect"
case "${1:-}" in
  --quarantine) MODE="quarantine" ;;
  --baseline)   MODE="baseline" ;;
  --verify)     MODE="verify" ;;
  "")           MODE="detect" ;;
  *) echo "Unknown arg: $1"; exit 1 ;;
esac

TS="$(date -u +"%Y%m%dT%H%M%SZ")"
QROOT="/var/SHIELD-quarantine"
QDIR="$QROOT/sweep-$TS"
mkdir -p "$QDIR"
chmod 700 "$QROOT"
REPORT="$QDIR/report.txt"
QUARANTINED="$QDIR/quarantined"
[[ "$MODE" == "quarantine" ]] && mkdir -p "$QUARANTINED"

exec > >(tee -a "$REPORT") 2>&1

echo "SHIELD sweep — $TS"
echo "Mode: $MODE"
echo "Host: $(hostname)   Boot: $(sysctl -n kern.boottime 2>/dev/null)"
echo "macOS: $(sw_vers -productVersion)  Build: $(sw_vers -buildVersion)"
echo "===================================================================="

SECTION() { printf '\n==== %s ====\n' "$1"; }
FINDING() { printf '  [FINDING] %s\n' "$1"; }
OK()      { printf '  [ok]      %s\n' "$1"; }
QUARANTINE() {
  local src="$1"
  if [[ "$MODE" == "quarantine" ]]; then
    local rel="${src#/}"
    local dest="$QUARANTINED/$rel"
    mkdir -p "$(dirname "$dest")"
    if mv "$src" "$dest" 2>/dev/null; then
      printf '  [QUARANTINED] %s -> %s\n' "$src" "$dest"
    else
      printf '  [QUARANTINE FAILED] %s (likely SIP-protected or in use)\n' "$src"
    fi
  fi
}

# ─── Configuration Profiles ────────────────────────────────────────────────
SECTION "Configuration Profiles (should be empty unless you installed one)"
PROF_OUT="$(profiles list -all 2>/dev/null || true)"
if [[ -z "$PROF_OUT" ]] || echo "$PROF_OUT" | grep -q "There are no configuration profiles installed"; then
  OK "No configuration profiles"
else
  echo "$PROF_OUT"
  FINDING "Configuration profiles present. Review each. Remove unknown via:"
  echo "    sudo profiles remove -identifier <id>"
fi

# ─── MDM enrollment ────────────────────────────────────────────────────────
SECTION "MDM enrollment status"
MDM_OUT="$(profiles status -type enrollment 2>/dev/null)"
echo "$MDM_OUT"
if echo "$MDM_OUT" | grep -qi "Enrolled via DEP: Yes"; then
  FINDING "Device is enrolled via DEP — MDM compromise suspected. Factory reset required."
fi

# ─── Sharing services ──────────────────────────────────────────────────────
SECTION "Sharing services (every one off unless used)"
for svc_label in com.apple.screensharing com.apple.smbd com.apple.AppleFileServer ssh com.apple.RemoteDesktop.PrivilegeProxy com.apple.RemoteDesktop.Helper com.apple.AirPlayXPCHelper; do
  if launchctl print "system/$svc_label" >/dev/null 2>&1; then
    state="LOADED"
    FINDING "Sharing service active: $svc_label"
    echo "      disable: sudo launchctl disable system/$svc_label && sudo launchctl bootout system/$svc_label"
  else
    OK "$svc_label not loaded"
  fi
done

# ─── LaunchAgents / LaunchDaemons ──────────────────────────────────────────
SECTION "User LaunchAgents (~/Library/LaunchAgents)"
USER_HOME="$(eval echo ~$SUDO_USER)"
USER_LA="$USER_HOME/Library/LaunchAgents"
if [[ -d "$USER_LA" ]]; then
  for f in "$USER_LA"/*.plist; do
    [[ -f "$f" ]] || continue
    label="$(basename "$f" .plist)"
    # Apple-shipped user LaunchAgents are rare; almost everything here is third-party
    FINDING "User LaunchAgent: $f"
    echo "      label: $label"
    plutil -p "$f" 2>/dev/null | head -20 | sed 's/^/        /'
    QUARANTINE "$f"
  done
else
  OK "No ~/Library/LaunchAgents directory"
fi

SECTION "System LaunchAgents (/Library/LaunchAgents)"
for f in /Library/LaunchAgents/*.plist; do
  [[ -f "$f" ]] || continue
  label="$(basename "$f" .plist)"
  signer="$(codesign -dvvv "$(plutil -extract Program raw "$f" 2>/dev/null || plutil -extract ProgramArguments.0 raw "$f" 2>/dev/null)" 2>&1 | grep "Authority=" | head -1 || true)"
  FINDING "System LaunchAgent: $f"
  echo "      label: $label"
  echo "      signer: ${signer:-(could not determine)}"
  plutil -p "$f" 2>/dev/null | head -10 | sed 's/^/        /'
done

SECTION "System LaunchDaemons (/Library/LaunchDaemons)"
for f in /Library/LaunchDaemons/*.plist; do
  [[ -f "$f" ]] || continue
  label="$(basename "$f" .plist)"
  FINDING "System LaunchDaemon: $f"
  echo "      label: $label"
  plutil -p "$f" 2>/dev/null | head -10 | sed 's/^/        /'
done

# ─── Apple-default LaunchAgents in /System are not listed; if anything has
# ─── been placed in /System/Library/LaunchAgents (requires SIP off), that's
# ─── catastrophic.
SECTION "Tampering of /System/Library/LaunchAgents (requires SIP-off to write)"
SYSTEM_LA_COUNT_EXPECTED=350  # rough Sonoma default
SYSTEM_LA_COUNT_ACTUAL="$(ls /System/Library/LaunchAgents/*.plist 2>/dev/null | wc -l | tr -d ' ')"
echo "  /System/Library/LaunchAgents plist count: $SYSTEM_LA_COUNT_ACTUAL (rough expected: ~$SYSTEM_LA_COUNT_EXPECTED)"
if [[ "$SYSTEM_LA_COUNT_ACTUAL" -gt $((SYSTEM_LA_COUNT_EXPECTED + 50)) ]]; then
  FINDING "/System/Library/LaunchAgents has more entries than expected — investigate."
fi

# ─── Cron / at jobs ────────────────────────────────────────────────────────
SECTION "Cron + at jobs (should be empty for most users)"
USER_CRON="$(sudo -u "$SUDO_USER" crontab -l 2>/dev/null || true)"
ROOT_CRON="$(crontab -l 2>/dev/null || true)"
if [[ -n "$USER_CRON" ]]; then FINDING "User crontab not empty:"; echo "$USER_CRON" | sed 's/^/    /'; else OK "User crontab empty"; fi
if [[ -n "$ROOT_CRON" ]]; then FINDING "Root crontab not empty:"; echo "$ROOT_CRON" | sed 's/^/    /'; else OK "Root crontab empty"; fi
AT_OUT="$(at -l 2>/dev/null || true)"
if [[ -n "$AT_OUT" ]]; then FINDING "at jobs scheduled:"; echo "$AT_OUT" | sed 's/^/    /'; else OK "No at jobs"; fi

# ─── /etc/hosts ────────────────────────────────────────────────────────────
SECTION "/etc/hosts"
HOSTS_NONLOOPBACK="$(grep -vE '^\s*#|^\s*$|^127\.|^::1|^fe80::|^ff' /etc/hosts || true)"
if [[ -z "$HOSTS_NONLOOPBACK" ]]; then
  OK "Only loopback entries in /etc/hosts"
else
  FINDING "Non-loopback entries in /etc/hosts (could be DNS hijack):"
  echo "$HOSTS_NONLOOPBACK" | sed 's/^/    /'
fi

# ─── sudoers ───────────────────────────────────────────────────────────────
SECTION "sudoers"
echo "  /etc/sudoers.d/ contents:"
ls -la /etc/sudoers.d/ 2>/dev/null | sed 's/^/    /'
for f in /etc/sudoers.d/*; do
  [[ -f "$f" ]] || continue
  base="$(basename "$f")"
  if [[ "$base" == "shield" ]]; then
    OK "Known: shield (SHIELD's sudoers rules)"
  else
    FINDING "Unknown sudoers file: $f"
    echo "----"
    cat "$f" | sed 's/^/    /'
    echo "----"
  fi
done

# ─── Known stalkerware / commercial spyware artifact paths ────────────────
SECTION "Known stalkerware artifact paths"
declare -a STALKER_PATHS=(
  # mSpy
  "/Library/Application Support/com.realtimesync.app"
  "/Library/Application Support/SyncMate"
  "$USER_HOME/Library/Application Support/com.realtimesync.app"
  # FlexiSpy
  "/Library/Application Support/FlexiSpy"
  "/usr/local/bin/fsmon"
  # Hoverwatch / TheTruthSpy
  "/Library/Application Support/Hoverwatch"
  # XKeyMon, Aobo, KidLogger, RealSpy, generic
  "$USER_HOME/Library/Preferences/com.kidlogger.kidlogger.plist"
  "$USER_HOME/Library/Application Support/com.kidlogger.kidlogger"
  "/Library/Application Support/Aobo"
  "/Library/Application Support/RealSpy"
  # Refog
  "/Library/Application Support/Refog"
  "/Applications/Refog Mac Keylogger.app"
  # Spyrix
  "/Applications/Spyrix Keylogger.app"
  # Common keylogger naming
  "/Applications/Keylogger.app"
  "/Applications/Free Keylogger.app"
  "/Applications/MacKeeper.app"
  # Pegasus / commercial spyware staging dirs (Amnesty MVT IoCs)
  "/var/db/com.apple.xpc.roleaccountd.staging"
  "/private/var/db/com.apple.xpc.roleaccountd.staging"
  # Suspicious LaunchAgent labels (well-known stalkerware)
)
for p in "${STALKER_PATHS[@]}"; do
  if [[ -e "$p" ]]; then
    FINDING "Known stalkerware path present: $p"
    QUARANTINE "$p"
  fi
done

declare -a STALKER_LA_LABELS=(
  "com.mspy.client"
  "com.flexispy"
  "com.hoverwatch"
  "com.refog"
  "com.spyrix"
  "com.kidlogger"
)
for label in "${STALKER_LA_LABELS[@]}"; do
  for d in /Library/LaunchAgents /Library/LaunchDaemons "$USER_LA"; do
    f="$d/$label.plist"
    if [[ -f "$f" ]]; then
      FINDING "Known stalkerware LaunchAgent: $f"
      QUARANTINE "$f"
    fi
  done
done

# ─── Privacy permissions (read TCC.db requires Full Disk Access) ──────────
SECTION "Privacy permissions (TCC database — manual review required)"
echo "  This script cannot read TCC.db without itself having Full Disk Access."
echo "  Check manually:"
echo "    System Settings → Privacy & Security → Full Disk Access"
echo "    System Settings → Privacy & Security → Accessibility"
echo "    System Settings → Privacy & Security → Input Monitoring"
echo "    System Settings → Privacy & Security → Screen Recording"
echo "    System Settings → Privacy & Security → Automation"
echo "  Anything you don't recognize: revoke."
TCC_USER="$USER_HOME/Library/Application Support/com.apple.TCC/TCC.db"
TCC_SYS="/Library/Application Support/com.apple.TCC/TCC.db"
for tcc in "$TCC_USER" "$TCC_SYS"; do
  if [[ -r "$tcc" ]]; then
    echo "  Reading: $tcc"
    sqlite3 "$tcc" 'SELECT service, client, auth_value FROM access' 2>/dev/null | sed 's/^/    /'
  fi
done

# ─── Listening sockets ─────────────────────────────────────────────────────
SECTION "Listening sockets (anything not on 127.x or ::1 is a question)"
LISTENERS="$(lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null)"
echo "$LISTENERS" | head -30
echo "$LISTENERS" | awk 'NR>1 && $9 !~ /^(127\.|\[::1\]|\*:53)/ { print "  [FINDING] non-loopback listener: " $0 }'

# ─── Established connections snapshot ──────────────────────────────────────
SECTION "Active TCP ESTABLISHED (snapshot — investigate non-mainstream domains)"
lsof -nP -iTCP -sTCP:ESTABLISHED 2>/dev/null | head -40

# ─── Kernel and system extensions ──────────────────────────────────────────
SECTION "Third-party kernel extensions (should be empty on Apple Silicon)"
KEXT_OUT="$(kextstat 2>/dev/null | grep -v com.apple || true)"
if [[ -z "$KEXT_OUT" ]]; then
  OK "No third-party kernel extensions loaded"
else
  echo "$KEXT_OUT"
  FINDING "Third-party kernel extensions present"
fi

SECTION "System extensions"
systemextensionsctl list 2>/dev/null

# ─── Recently modified plist in launch dirs (last 30 days) ────────────────
SECTION "Recently modified plists in launch dirs (last 30 days)"
find "$USER_LA" /Library/LaunchAgents /Library/LaunchDaemons -name "*.plist" -mtime -30 -ls 2>/dev/null | sed 's/^/    /'

# ─── Recently installed packages (last 30 days) ───────────────────────────
SECTION "Recently installed package receipts (last 30 days)"
find /Library/Receipts /private/var/db/receipts -name "*.bom" -mtime -30 -ls 2>/dev/null | sed 's/^/    /' | head -50

# ─── Apps not signed by Apple or App Store ────────────────────────────────
SECTION "Apps with non-Apple/non-App-Store signatures"
system_profiler SPApplicationsDataType 2>/dev/null | awk '
  /^    [^ ]/ { name=$0; src=""; lm=""; sb="" }
  /Obtained from:/ { src=$0 }
  /Last Modified:/ { lm=$0 }
  /Signed by:/ {
    sb=$0
    if (src !~ /Apple|App Store/) printf "%s\n  %s\n  %s\n  %s\n\n", name, src, lm, sb
  }
' | head -200

# ─── Saved Wi-Fi networks (will auto-join evil twins) ─────────────────────
SECTION "Saved Wi-Fi networks (forget any you don't fully control)"
networksetup -listpreferredwirelessnetworks en0 2>/dev/null | sed 's/^/    /'
networksetup -listpreferredwirelessnetworks en1 2>/dev/null | sed 's/^/    /'

# ─── DNS configuration ────────────────────────────────────────────────────
SECTION "DNS configuration"
scutil --dns 2>/dev/null | grep -E 'nameserver|search domain|resolver' | head -30 | sed 's/^/    /'

# ─── Login history ────────────────────────────────────────────────────────
SECTION "Login history (last 50)"
last -50 2>/dev/null | head -50 | sed 's/^/    /'

# ─── Hashed baseline of critical binary directories ───────────────────────
if [[ "$MODE" == "baseline" ]]; then
  SECTION "Writing baseline hashes"
  BASELINE="$QDIR/baseline.sha256"
  for d in /usr/local/bin /usr/local/sbin /opt /Applications "$USER_HOME/Applications"; do
    [[ -d "$d" ]] || continue
    find "$d" -type f \( -perm -u+x -o -name "*.dylib" -o -name "*.app" \) -print0 2>/dev/null | \
      xargs -0 -I{} shasum -a 256 "{}" 2>/dev/null
  done > "$BASELINE"
  echo "  Baseline written: $BASELINE"
  echo "  Lines: $(wc -l < "$BASELINE")"
fi

if [[ "$MODE" == "verify" ]]; then
  SECTION "Verifying against last baseline"
  LAST_BASELINE="$(ls -t "$QROOT"/sweep-*/baseline.sha256 2>/dev/null | head -1)"
  if [[ -z "$LAST_BASELINE" ]]; then
    FINDING "No prior baseline found in $QROOT — run with --baseline first"
  else
    echo "  Comparing against: $LAST_BASELINE"
    while IFS= read -r line; do
      hash="${line%% *}"
      file="${line#*  }"
      if [[ -f "$file" ]]; then
        current="$(shasum -a 256 "$file" 2>/dev/null | awk '{print $1}')"
        if [[ "$current" != "$hash" ]]; then
          FINDING "Hash mismatch: $file"
          echo "      baseline: $hash"
          echo "      current:  $current"
        fi
      else
        FINDING "File in baseline now missing: $file"
      fi
    done < "$LAST_BASELINE"
  fi
fi

# ─── Final summary + report integrity hash ────────────────────────────────
SECTION "End"
echo "Report: $REPORT"
echo "Mode: $MODE"
[[ "$MODE" == "quarantine" ]] && echo "Quarantined items moved to: $QUARANTINED"
echo ""
echo "Hash this report for integrity:"
echo "  shasum -a 256 $REPORT"

shasum -a 256 "$REPORT" > "$REPORT.sha256"
echo "  Hash stored: $REPORT.sha256"
echo ""
echo "Read the report. Anything marked [FINDING] needs your eyes on it."
echo "If you found Configuration Profiles, MDM enrollment, kernel extensions,"
echo "non-loopback listeners, or stalkerware paths: stop, do not change anything"
echo "else, and call Access Now (https://www.accessnow.org/help/) before you"
echo "destroy evidence."
