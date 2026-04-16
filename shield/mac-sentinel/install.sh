#!/usr/bin/env bash
# SHIELD Mac Sentinel installer.
#
# - Copies the sentinel into ~/Library/Application Support/SHIELD/sentinel/
# - Stores the PIN in the macOS login keychain (so you don't type it at boot)
# - Writes and loads a LaunchAgent plist
#
# Run: bash install.sh

set -euo pipefail

APP_DIR="$HOME/Library/Application Support/SHIELD"
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
DEST_DIR="$APP_DIR/sentinel"
PLIST_PATH="$HOME/Library/LaunchAgents/com.shield.sentinel.plist"
LOG_PATH="$APP_DIR/sentinel.log"
ERR_PATH="$APP_DIR/sentinel.err"
KEYCHAIN_SERVICE="com.shield.sentinel"
KEYCHAIN_ACCOUNT="pin"

# ─── Sanity checks ─────────────────────────────────────────────────────────
if [[ "$(uname)" != "Darwin" ]]; then
  echo "SHIELD Mac Sentinel is macOS-only."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install via https://nodejs.org or Homebrew: brew install node"
  exit 1
fi

NODE_BIN="$(command -v node)"
echo "Using node: $NODE_BIN ($(node --version))"

# ─── Stage files ───────────────────────────────────────────────────────────
mkdir -p "$APP_DIR"
mkdir -p "$DEST_DIR"
chmod 700 "$APP_DIR"
rsync -a --delete --exclude '.git' "$SRC_DIR/" "$DEST_DIR/"
echo "Staged sentinel to $DEST_DIR"

# ─── First run setup (if needed) ───────────────────────────────────────────
if [[ ! -f "$APP_DIR/verifier.json" ]]; then
  echo ""
  echo "No PIN configured yet. Running first-time setup…"
  "$NODE_BIN" "$DEST_DIR/sentinel.js" --setup
fi

# ─── Store the PIN in the login keychain ──────────────────────────────────
echo ""
echo "Storing your PIN in the macOS login keychain so the LaunchAgent can"
echo "start without prompting. You will be asked for your macOS login"
echo "password to authorize the keychain write."
echo ""
read -r -s -p "Enter your SHIELD PIN again (it will not be echoed): " PIN
echo ""

# Delete any existing entry first to avoid duplicates.
security delete-generic-password -s "$KEYCHAIN_SERVICE" -a "$KEYCHAIN_ACCOUNT" >/dev/null 2>&1 || true
security add-generic-password -s "$KEYCHAIN_SERVICE" -a "$KEYCHAIN_ACCOUNT" -w "$PIN" -T "$NODE_BIN" -T /usr/bin/security
unset PIN

# ─── Write LaunchAgent plist ──────────────────────────────────────────────
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.shield.sentinel</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-c</string>
    <string>export SHIELD_PIN="\$(/usr/bin/security find-generic-password -s $KEYCHAIN_SERVICE -a $KEYCHAIN_ACCOUNT -w)" &amp;&amp; exec "$NODE_BIN" "$DEST_DIR/sentinel.js"</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>
  <key>StandardOutPath</key>
  <string>$LOG_PATH</string>
  <key>StandardErrorPath</key>
  <string>$ERR_PATH</string>
  <key>ThrottleInterval</key>
  <integer>10</integer>
  <key>WorkingDirectory</key>
  <string>$DEST_DIR</string>
</dict>
</plist>
PLIST
chmod 600 "$PLIST_PATH"

# ─── Load the agent ───────────────────────────────────────────────────────
launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load -w "$PLIST_PATH"
sleep 1
if launchctl list | grep -q com.shield.sentinel; then
  echo ""
  echo "✓ SHIELD Sentinel is loaded and running."
  echo ""
  echo "Logs:"
  echo "  stdout: $LOG_PATH"
  echo "  stderr: $ERR_PATH"
  echo ""
  echo "Next step: open the PWA, go to Settings → Mac Sentinel, and pair."
  echo "The cert fingerprint is printed at startup — grab it from $LOG_PATH."
else
  echo "Failed to load LaunchAgent. Check $ERR_PATH for details."
  exit 1
fi
