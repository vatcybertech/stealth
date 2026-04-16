# SHIELD — Context for Claude Code

## What this is
A two-tier personal device/network defense system for one developer, protecting one iPhone and one MacBook. Lives at `shield/` inside the `dkfitcoaching-lab/Base-Template` repo (developed on branch `claude/build-shield-security-AEfJc`).

## Architecture
- **Mac Sentinel** (`mac-sentinel/`) — Node.js daemon, built-in modules only, runs under LaunchAgent as the user. Real detection surface: `arp`, `system_profiler`, `profiles`, `launchctl`, `codesign`, `log show`, `spctl`, `fdesetup`, `csrutil`. Hash-chained encrypted ledger. Serves local HTTPS on `127.0.0.1` with PIN-derived auth.
- **PWA** (`pwa/`) — Installable web app, offline-first, single-page. PIN → PBKDF2 → AES-256-GCM encrypted IndexedDB. Hash-chained journal. Talks to Mac Sentinel on `https://127.0.0.1:<port>` when on same device or same LAN. iOS integration via `shortcuts://x-callback-url`.
- **iOS Shortcuts** (`shortcuts/`) — Kill Switch, Night Mode, Morning Check. These are the ONLY way to toggle iOS radios from a PWA.

## Hard constraints
- **Zero network egress.** Nothing calls the internet. No CDN, no analytics, no telemetry.
- **Zero external dependencies.** Mac Sentinel uses Node built-ins only. PWA uses Web Platform only.
- **No plaintext at rest.** All persisted state is encrypted with a PIN-derived key.
- **No feature theater.** If a capability cannot be verified, it must not be shown as active. See `docs/CAPABILITIES.md`.
- **Law-abiding.** See `docs/LEGAL.md`. Only observe devices and networks the developer owns.

## Conventions
- Shared ease curve for any motion: `cubic-bezier(0.22, 1, 0.36, 1)`.
- Color tokens defined in `pwa/style.css` `:root` — never hardcode.
- Severity levels: `INFO | LOW | MEDIUM | HIGH | CRITICAL`.
- Event types (stable, don't rename): `SCAN`, `DEVICE_NEW`, `DEVICE_UNKNOWN`, `DEVICE_RETURNED`, `PROFILE_CHANGE`, `LAUNCHAGENT_CHANGE`, `LOGIN_ITEM_CHANGE`, `PROCESS_UNSIGNED`, `LOCKDOWN_OFF`, `FILEVAULT_OFF`, `SIP_OFF`, `GATEKEEPER_OFF`, `SSID_CHANGE`, `KILL_SWITCH`, `SETTINGS_CHANGE`, `APP_OPEN`, `APP_LOCK`, `EXPORT`, `JOURNAL_ENTRY`, `ALERT`, `LEDGER_TAMPER`.
- Every ledger entry has: `id` (UUIDv4), `ts` (ISO 8601 UTC), `tz` (local offset), `type`, `severity`, `payload`, `prevHash`, `hash`.

## Testing
- Mac Sentinel: `node mac-sentinel/sentinel.js --self-test` runs collectors in dry mode and validates ledger chaining.
- PWA: open `pwa/index.html` in Safari, install to home screen, confirm PIN flow, confirm offline operation by toggling airplane mode.

## Do not
- Add analytics, error reporting, or remote logging.
- Introduce a bundler or transpiler unless absolutely necessary — source must run directly.
- Add UI animations beyond subtle state transitions. This is a security tool, not a showcase.
- Add features that the iPhone PWA cannot actually do. Document limits; do not fake capabilities.
