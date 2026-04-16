#!/usr/bin/env bash
# SHIELD Mac Sentinel uninstaller.
#
# Removes the LaunchAgent, keychain entry, and (optionally) the ledger.
#
# Usage:
#   bash uninstall.sh           Remove agent + keychain, KEEP ledger and state
#   bash uninstall.sh --purge   Also wipe ledger, state, certs, verifier

set -euo pipefail

APP_DIR="$HOME/Library/Application Support/SHIELD"
PLIST_PATH="$HOME/Library/LaunchAgents/com.shield.sentinel.plist"
KEYCHAIN_SERVICE="com.shield.sentinel"
KEYCHAIN_ACCOUNT="pin"

echo "Unloading LaunchAgent…"
launchctl unload "$PLIST_PATH" 2>/dev/null || true
rm -f "$PLIST_PATH"

echo "Removing keychain entry…"
security delete-generic-password -s "$KEYCHAIN_SERVICE" -a "$KEYCHAIN_ACCOUNT" >/dev/null 2>&1 || true

if [[ "${1:-}" == "--purge" ]]; then
  echo "Purging SHIELD application support directory…"
  rm -rf "$APP_DIR"
  echo "SHIELD fully removed."
else
  echo "SHIELD Sentinel stopped and unloaded. Ledger and state retained at:"
  echo "  $APP_DIR"
  echo "Run with --purge to remove everything."
fi
