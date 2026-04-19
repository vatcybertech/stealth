#!/usr/bin/env bash
# SHIELD — quick audit. Single command, dumps everything questionable about
# the current Mac. Read the output yourself; this script does not interpret.
#
# Usage:
#   bash shield/audit.sh                 # print to stdout
#   bash shield/audit.sh > audit.txt     # save to file
#
# Read every section. Anything you don't recognize is a question worth asking.

set -uo pipefail

SECTION() { printf '\n==== %s ====\n' "$1"; }
NOTE()    { printf '  -- %s\n' "$1"; }
RUN()     { printf '$ %s\n' "$*"; "$@" 2>&1 || true; printf '\n'; }

if [[ "$(uname)" != "Darwin" ]]; then
  echo "shield/audit.sh is macOS-only."
  exit 1
fi

printf 'SHIELD audit — %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
printf 'Host: %s   User: %s\n' "$(hostname)" "$(whoami)"

SECTION "OS / hardware"
RUN sw_vers
RUN uname -a
RUN system_profiler SPHardwareDataType | grep -E 'Model|Chip|Serial|Hardware UUID|Provisioning UDID' || true

SECTION "Security baseline (every line should look right)"
RUN csrutil status
RUN spctl --status
RUN fdesetup status
RUN /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
RUN /usr/libexec/ApplicationFirewall/socketfilterfw --getstealthmode
NOTE "Lockdown Mode: check System Settings → Privacy & Security → Lockdown Mode (no CLI)."

SECTION "Configuration profiles (should be empty unless you installed one)"
RUN sudo profiles list -all 2>/dev/null
NOTE "If sudo failed, run: sudo bash shield/audit.sh"

SECTION "MDM enrollment status"
RUN profiles status -type enrollment

SECTION "Sharing services (every one of these should be off unless used)"
for svc in com.apple.screensharing com.apple.smbd com.apple.AppleFileServer ssh com.apple.RemoteDesktop.PrivilegeProxy com.apple.RemoteDesktop.Helper com.apple.AirPlayXPCHelper; do
  state=$(launchctl print-disabled system 2>/dev/null | grep -E "\"$svc\"" || echo "  (not present)")
  printf '%s : %s\n' "$svc" "$state"
done

SECTION "Login items + persistent agents"
NOTE "GUI: System Settings → General → Login Items"
RUN ls -la ~/Library/LaunchAgents
RUN ls -la /Library/LaunchAgents
RUN sudo ls -la /Library/LaunchDaemons

SECTION "Loaded LaunchAgents (user)"
RUN launchctl list

SECTION "Loaded LaunchDaemons (system) — top 50"
RUN sudo launchctl list 2>/dev/null
NOTE "Compare against fresh-install baseline. Anything 'com.unknown' or pointing into /tmp is hostile."

SECTION "Cron + at jobs (should be empty for most users)"
RUN crontab -l
RUN sudo crontab -l 2>/dev/null
RUN at -l 2>/dev/null

SECTION "Sudoers"
RUN sudo ls -la /etc/sudoers.d/
RUN sudo cat /etc/sudoers
for f in /etc/sudoers.d/*; do
  [ -f "$f" ] || continue
  printf '\n--- %s ---\n' "$f"
  sudo cat "$f"
done

SECTION "/etc/hosts (should be loopback only)"
RUN cat /etc/hosts

SECTION "DNS configuration in use"
RUN scutil --dns

SECTION "Network interfaces"
RUN ifconfig -a
RUN netstat -rn -f inet | head -20

SECTION "Listening sockets (anything not loopback is a question)"
RUN sudo lsof -nP -iTCP -sTCP:LISTEN
RUN sudo lsof -nP -iUDP

SECTION "Active TCP connections (snapshot)"
RUN sudo lsof -nP -iTCP -sTCP:ESTABLISHED 2>/dev/null | head -50

SECTION "Local user accounts"
RUN dscl . list /Users | grep -v '^_'

SECTION "Logged-in sessions (now and recent)"
RUN who
RUN last -50

SECTION "Wi-Fi configuration + saved networks"
RUN /System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I
RUN networksetup -listpreferredwirelessnetworks en0 2>/dev/null
RUN networksetup -listpreferredwirelessnetworks en1 2>/dev/null

SECTION "Bluetooth state + paired devices"
RUN system_profiler SPBluetoothDataType | head -50

SECTION "Recently installed packages (last 30 days)"
RUN find /Library/Receipts /private/var/db/receipts -name "*.bom" -mtime -30 -ls 2>/dev/null | head -50

SECTION "Recently modified plists in launch dirs (last 30 days)"
RUN find ~/Library/LaunchAgents /Library/LaunchAgents /Library/LaunchDaemons -name "*.plist" -mtime -30 -ls 2>/dev/null

SECTION "Apps with non-Apple/non-AppStore signatures"
RUN system_profiler SPApplicationsDataType 2>/dev/null | awk '
  /^    [^ ]/ { name=$0 }
  /Obtained from:/ { src=$0 }
  /Last Modified:/ { lm=$0 }
  /Signed by:/ { sb=$0; if (src !~ /Apple|App Store/) printf "%s\n  %s\n  %s\n  %s\n\n", name, src, lm, sb }
'

SECTION "Privacy permissions — high-impact categories"
NOTE "These you must check via GUI. The TCC.db requires Full Disk Access to read."
NOTE "  System Settings → Privacy & Security → Full Disk Access"
NOTE "  System Settings → Privacy & Security → Accessibility"
NOTE "  System Settings → Privacy & Security → Input Monitoring"
NOTE "  System Settings → Privacy & Security → Screen Recording"
NOTE "  System Settings → Privacy & Security → Automation"
NOTE "Walk every category. Anything you don't recognize: revoke."

SECTION "Kernel extensions (should be empty on Apple Silicon)"
RUN kextstat 2>/dev/null | grep -v com.apple

SECTION "System extensions"
RUN systemextensionsctl list 2>/dev/null

SECTION "Time Machine status"
RUN tmutil destinationinfo
RUN tmutil status

SECTION "Recent system log — auth, screen, network anomalies (last 6h)"
RUN log show --last 6h --style syslog --predicate 'eventMessage CONTAINS[c] "authd" OR eventMessage CONTAINS[c] "ssh" OR eventMessage CONTAINS[c] "screensharing" OR eventMessage CONTAINS[c] "RemoteDesktop"' 2>/dev/null | tail -100

SECTION "End"
printf 'Audit complete. Read the output. Document anything you do not recognize before changing it.\n'
