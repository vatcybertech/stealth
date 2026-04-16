# SHIELD Architecture

## Two tiers, one cohesive system

```
┌──────────────────────────────┐         ┌──────────────────────────────┐
│          iPhone              │         │          MacBook             │
│                              │         │                              │
│   ┌──────────────────────┐   │         │   ┌──────────────────────┐   │
│   │     SHIELD PWA       │◄──┼─────────┼──►│     SHIELD PWA       │   │
│   │   (dashboard +       │   │   same  │   │   (dashboard +       │   │
│   │    journal +         │   │    Wi-Fi│   │    journal +         │   │
│   │    checklist +       │   │    only │   │    checklist +       │   │
│   │    kill switch)      │   │         │   │    kill switch)      │   │
│   └──────────┬───────────┘   │         │   └──────────┬───────────┘   │
│              │               │         │              │               │
│              ▼               │         │              ▼               │
│   ┌──────────────────────┐   │         │   ┌──────────────────────┐   │
│   │  iOS Shortcuts       │   │         │   │   Mac Sentinel       │   │
│   │  (kill switch,       │   │         │   │   (daemon, real      │   │
│   │   night mode,        │   │         │   │    detection,        │   │
│   │   morning check)     │   │         │   │    HTTPS API)        │   │
│   └──────────────────────┘   │         │   └──────────────────────┘   │
└──────────────────────────────┘         └──────────────────────────────┘
```

## Components

### Mac Sentinel (`mac-sentinel/`)
A Node.js daemon running under LaunchAgent as the user. Built-in modules only.

**Collectors** — one file per domain:
- `collectors/network.js` — `arp`, `airport`, `networksetup`, `lsof`, `netstat`, `dns-sd`.
- `collectors/bluetooth.js` — `system_profiler SPBluetoothDataType -json`.
- `collectors/profiles.js` — `profiles show -type configuration`. **Highest-signal check.**
- `collectors/launch_agents.js` — enumerate & hash `~/Library/LaunchAgents`, `/Library/LaunchAgents`, `/Library/LaunchDaemons`.
- `collectors/login_items.js` — `osascript` against System Events.
- `collectors/integrity.js` — Lockdown Mode plist, `csrutil`, `fdesetup`, `spctl`, `socketfilterfw`.
- `collectors/processes.js` — `ps` + `codesign -dv` verification. Flags unsigned or ad-hoc.
- `collectors/logins.js` — `last` + `log show` predicate for auth events.
- `collectors/sharing.js` — `launchctl` enumeration of Apple sharing services.

**Analyzer** (`lib/analyzer.js`):
- Compares current scan against previous scan via diff on a normalized, stable-keyed state tree.
- Emits events by type and severity.
- Applies rules (`lib/rules.js`) to escalate based on user-defined policy.

**Ledger** (`lib/ledger.js`):
- Append-only. Each entry contains `{id, ts, tz, type, severity, payload, prevHash, hash}`.
- `hash = SHA256(prevHash || canonicalJSON(entry without hash))`.
- On every read, the loader re-verifies the chain. Mismatch → `LEDGER_TAMPER` critical event.
- Storage: single file `~/Library/Application Support/SHIELD/ledger.jsonl.enc`, encrypted in 1KB blocks with AES-256-GCM, key derived from PIN via PBKDF2(100k, SHA-256).

**Server** (`lib/server.js`):
- `https://127.0.0.1:<port>` using a self-signed cert generated on first run and pinned in the PWA.
- Bearer auth — token derived from PIN+salt via PBKDF2 (different salt than the ledger key).
- Endpoints:
  - `POST /auth` — PIN verification, issues a short-lived session token.
  - `GET /status` — current state tree (latest scan + baseline metrics).
  - `GET /alerts?since=<iso>` — alerts since timestamp.
  - `GET /ledger?since=<iso>` — raw ledger entries since timestamp.
  - `GET /export` — signed, hash-chained JSON evidence export.
  - `POST /whitelist` — add/remove whitelist entries.
  - `POST /journal` — push a PWA journal entry into the Sentinel ledger for cross-device integrity.
  - `POST /killswitch` — record a kill-switch activation.
- CORS: `Access-Control-Allow-Origin` restricted to the PWA origin (either `https://dkfitcoaching-lab.github.io` when hosted there, or `null` for local-file install, or a user-configured origin).

**Config** (`config/defaults.json`):
- Scan interval, aggressive interval, whitelist, rule definitions, port number.

### PWA (`pwa/`)
Single-page, offline-first, zero external assets.

**Files:**
- `index.html` — shell + splash + app mount.
- `manifest.json` — standalone, dark theme, vermillion accent.
- `sw.js` — service worker: cache-first for all assets, self-update on version bump.
- `style.css` — dark theme, vermillion tokens, one-handed mobile layout.
- `crypto.js` — PBKDF2 + AES-GCM helpers + constant-time compare.
- `js/storage.js` — encrypted IndexedDB (object stores: `settings`, `journal`, `alerts`, `devices`, `whitelist`, `checklist`, `sessions`).
- `js/ledger.js` — PWA-side hash-chained journal (independent of the Sentinel ledger, but mirrors the same schema so they can be merged on export).
- `js/sentinel-client.js` — talks to Mac Sentinel over HTTPS with PIN-derived bearer token.
- `js/checklist.js` — hardening checklist data model, tied to `HARDENING.md`.
- `js/shortcuts.js` — iOS `shortcuts://` URL helpers.
- `js/ui.js` — render layer: dashboard, journal, checklist, settings, evidence export.
- `app.js` — wires it all together, handles PIN flow, auto-lock, routing.

**PIN flow:**
1. First launch: 6+ digit PIN → PBKDF2(100k, SHA-256) → AES-256-GCM key + verifier hash (with a *different* PBKDF2 salt).
2. Subsequent launches: enter PIN → derive key → attempt to decrypt a known verifier blob → if success, unlock.
3. 10 wrong attempts → auto-wipe IndexedDB (configurable, default on).
4. Inactivity → lock (configurable, default 60s).
5. Lock → zero out all keys from memory, re-prompt on next interaction.

**Sentinel pairing:**
1. On first run, the Sentinel prints a pairing code (derived from its cert hash + PIN).
2. User enters the code in the PWA. PWA stores the Sentinel's public cert fingerprint and the bearer token salt.
3. Subsequent connections: PWA presents the fingerprint → Sentinel verifies → issues session token for the connection.
4. Certificate pinning: PWA refuses any Sentinel response that doesn't match the pinned fingerprint.

### iOS Shortcuts (`shortcuts/`)
Markdown setup instructions. The PWA launches them via `shortcuts://run-shortcut?name=...`. First run requires user confirmation; after that, Shortcuts remembers and runs silently unless the user locked it behind a permission.

**Shortcuts:**
- **SHIELD Kill Switch** — Airplane Mode ON, Wi-Fi off, Bluetooth off, open SHIELD.
- **SHIELD Night Mode** — Do Not Disturb, Bluetooth off, open SHIELD in aggressive-polling mode, scheduled automation at bedtime.
- **SHIELD Morning Check** — Check Airplane Mode off, Wi-Fi on trusted SSID, Lockdown Mode on, open SHIELD dashboard, scheduled automation in the morning.
- **SHIELD Log Setting Snapshot** — reads current Wi-Fi SSID, Bluetooth state, Airplane state, and writes them to a Notes note or appends to SHIELD via URL scheme.

## Data flow

1. Mac Sentinel polls collectors every 30s (5s in aggressive mode).
2. Each collector returns a state object.
3. Analyzer diffs current state against previous state + baseline.
4. New events are written to the ledger.
5. Severity ≥ MEDIUM → raised as alerts.
6. PWA polls `/status` and `/alerts?since=<lastSeen>` every 10s when foregrounded.
7. PWA renders unified dashboard: Sentinel state + local journal + checklist.
8. On export, PWA fetches `/export` from Sentinel and merges with local journal, producing a single signed JSON + printable HTML report.

## Threat model

**In scope:**
- Remote exploitation of macOS via known and unknown vulnerabilities (detected post-foothold via LaunchAgent, profile, and process anomalies).
- Configuration Profile injection (the #1 iPhone persistence technique used by commercial spyware).
- Physical-proximity Bluetooth attacks (detected in BT enumeration).
- Rogue devices on home Wi-Fi (detected in ARP/mDNS scan).
- Account takeover of Apple ID, Google, GitHub, etc. (mitigated via hardening checklist + user-side 2FA enforcement).
- Insider or physical-access adversary toggling Lockdown Mode, FileVault, Firewall, SIP, or Gatekeeper off (detected within 30s).
- Tampering with the Sentinel's own ledger (detected via hash chain on every read).

**Out of scope:**
- Kernel-level rootkits that have already patched the system below the Sentinel's view. SHIELD is not a kernel defender; it relies on SIP + Lockdown Mode for that.
- Deep packet inspection or on-wire capture. SHIELD is a host-based IDS, not a network IDS.
- Attacks against the PWA's own JavaScript running in a compromised browser. If the browser is owned, nothing in the browser is trustworthy.
- Coercion attacks against the user (rubber-hose cryptanalysis). The 10-wrong-PIN wipe helps a little; nothing helps a lot.

## Why this architecture

- **Mac does the heavy lifting** because a Mac can. It has shell access, `codesign`, `system_profiler`, `profiles`, `launchctl`, `log show`. These are the real teeth.
- **iPhone is a dashboard and journal** because that is what a PWA on iPhone can honestly be.
- **The two are cohesive** via the local HTTPS API and a shared event schema.
- **Nothing leaves your LAN** because nothing needs to.
- **Zero dependencies** because every dependency is a supply-chain attack surface, and a security tool cannot take that risk.
