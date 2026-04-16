#!/usr/bin/env bash
# SHIELD Mac Sentinel — sudoers rule installer.
#
# Grants the Sentinel's Node binary NOPASSWD access to a TIGHTLY
# SCOPED whitelist of commands needed for active enforcement:
#
#   /usr/bin/profiles remove -identifier *
#       Remove an unauthorized configuration profile
#
#   /bin/launchctl disable system/*
#       Disable a system sharing service (Screen Sharing, SSH, ARD, etc.)
#
#   /sbin/pfctl -t shield_block -T *
#       Add/remove/flush the SHIELD pf block table
#
#   /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate *
#   /usr/libexec/ApplicationFirewall/socketfilterfw --setstealthmode *
#       Re-enable Firewall + Stealth if they drift off
#
#   /usr/sbin/spctl --master-enable
#       Re-enable Gatekeeper if it drifts off
#
#   /bin/cp <SHIELD_STATE_DIR>/baselines/etc-hosts.baseline /etc/hosts
#       Restore /etc/hosts from the SHIELD-owned baseline
#
# NOTHING ELSE. This is the minimum privilege required for SHIELD to
# defend you while you sleep. Review every line before installing.
#
# Usage:
#   sudo bash install-sudoers.sh              install
#   sudo bash install-sudoers.sh --uninstall  remove
#   sudo bash install-sudoers.sh --print      print the rules file and exit

set -euo pipefail

SHIELD_USER="${SUDO_USER:-$USER}"
RULES_FILE="/etc/sudoers.d/shield"
BASELINE_PATH="/Users/${SHIELD_USER}/Library/Application Support/SHIELD/baselines/etc-hosts.baseline"

read -r -d '' RULES <<EOF || true
# SHIELD Mac Sentinel — tightly scoped sudoers rules.
# This file was written by mac-sentinel/install-sudoers.sh.
# Review every line. Remove with 'sudo rm /etc/sudoers.d/shield'.
#
# Granted to user: ${SHIELD_USER}
# Created: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

Cmnd_Alias SHIELD_PROFILES = /usr/bin/profiles remove -identifier *
Cmnd_Alias SHIELD_LAUNCHCTL = /bin/launchctl disable system/*
Cmnd_Alias SHIELD_PFCTL = /sbin/pfctl -t shield_block -T add *, \\
                          /sbin/pfctl -t shield_block -T delete *, \\
                          /sbin/pfctl -t shield_block -T flush, \\
                          /sbin/pfctl -t shield_block -T show
Cmnd_Alias SHIELD_FIREWALL = /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on, \\
                             /usr/libexec/ApplicationFirewall/socketfilterfw --setstealthmode on
Cmnd_Alias SHIELD_GATEKEEPER = /usr/sbin/spctl --master-enable
Cmnd_Alias SHIELD_HOSTS = /bin/cp "${BASELINE_PATH}" /etc/hosts
Cmnd_Alias SHIELD_BPUTIL = /usr/bin/bputil -d

${SHIELD_USER} ALL=(root) NOPASSWD: SHIELD_PROFILES, \\
                                    SHIELD_LAUNCHCTL, \\
                                    SHIELD_PFCTL, \\
                                    SHIELD_FIREWALL, \\
                                    SHIELD_GATEKEEPER, \\
                                    SHIELD_HOSTS, \\
                                    SHIELD_BPUTIL
EOF

print_rules() {
  echo "# ─── SHIELD sudoers rules that would be installed ───"
  echo "$RULES"
  echo "# ─────────────────────────────────────────────────────"
}

if [[ "${1:-}" == "--print" ]]; then
  print_rules
  exit 0
fi

if [[ $EUID -ne 0 ]]; then
  echo "This script must run as root. Re-run with: sudo bash $0"
  exit 1
fi

if [[ "${1:-}" == "--uninstall" ]]; then
  if [[ -f "$RULES_FILE" ]]; then
    rm -f "$RULES_FILE"
    echo "Removed $RULES_FILE"
  else
    echo "Nothing to remove — $RULES_FILE does not exist."
  fi
  exit 0
fi

echo "About to install SHIELD sudoers rules at $RULES_FILE"
echo ""
print_rules
echo ""
read -r -p "Proceed? This grants ${SHIELD_USER} NOPASSWD access to the commands above. [yes/NO] " confirm
if [[ "$confirm" != "yes" ]]; then
  echo "Aborted."
  exit 1
fi

# visudo syntax check before activation
TMP_FILE="$(mktemp /tmp/shield-sudoers.XXXXXX)"
printf "%s\n" "$RULES" > "$TMP_FILE"
chmod 0440 "$TMP_FILE"
if ! visudo -c -f "$TMP_FILE" >/dev/null 2>&1; then
  echo "ERROR: visudo rejected the rules file. Not installing."
  echo "visudo output:"
  visudo -c -f "$TMP_FILE" || true
  rm -f "$TMP_FILE"
  exit 1
fi
install -m 0440 -o root -g wheel "$TMP_FILE" "$RULES_FILE"
rm -f "$TMP_FILE"

echo ""
echo "Installed $RULES_FILE"
echo ""
echo "Verify with:"
echo "  sudo cat $RULES_FILE"
echo ""
echo "Revoke with:"
echo "  sudo bash $0 --uninstall"
echo ""
echo "SHIELD active enforcement is now available. Restart the Sentinel to pick up the new privileges:"
echo "  launchctl unload ~/Library/LaunchAgents/com.shield.sentinel.plist"
echo "  launchctl load ~/Library/LaunchAgents/com.shield.sentinel.plist"
