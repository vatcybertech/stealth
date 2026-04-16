# SHIELD

**A two-tier personal device & network defense system for one iPhone and one MacBook.**

SHIELD is **not** a magic app. It is an honest, layered defense:

- A **Mac Sentinel** daemon that runs on your MacBook and does real, capable intrusion detection (config profile monitoring, LaunchAgent monitoring, network device discovery, Bluetooth enumeration, code-signature verification, tamper-evident logging).
- A **PWA dashboard** that runs on iPhone and Mac, gives you a unified view, an encrypted incident journal, a hardening checklist, and a kill switch.
- A set of **iOS Shortcuts** that bridge the things a PWA cannot do on iPhone (toggling Wi-Fi, Bluetooth, Airplane Mode).
- A set of **runbooks** (`docs/`) for hardening, incident response, and legal boundaries in Ohio, USA.

## What SHIELD can actually see and do

Read [`docs/CAPABILITIES.md`](docs/CAPABILITIES.md) first. It is a brutally honest list of what each component can and cannot observe. Do not skip it. The single most dangerous thing a security tool can do is give you a green light for a thing it isn't actually checking.

## Start here (in this order)

1. Read [`docs/CAPABILITIES.md`](docs/CAPABILITIES.md).
2. Read [`docs/HARDENING.md`](docs/HARDENING.md) and do every step. This matters more than any code in this repo.
3. If you cannot factory-reset the iPhone, read [`docs/IPHONE_EXORCISM.md`](docs/IPHONE_EXORCISM.md) — the "make it act like a new phone without DFU" runbook.
4. Read [`docs/INCIDENT_RESPONSE.md`](docs/INCIDENT_RESPONSE.md) and keep it bookmarked.
5. Install the Mac Sentinel: [`docs/DEPLOY.md`](docs/DEPLOY.md).
6. Install the PWA on iPhone and Mac: [`docs/DEPLOY.md`](docs/DEPLOY.md).
7. Set up the iOS Shortcuts: [`docs/SHORTCUTS.md`](docs/SHORTCUTS.md).
8. Read [`docs/OPSEC.md`](docs/OPSEC.md) — don't broadcast what you're running.
9. Read [`docs/VPN_GUIDANCE.md`](docs/VPN_GUIDANCE.md) — should you run one, what breaks if someone else does.
10. Read [`docs/CRYPTO_REVIEW.md`](docs/CRYPTO_REVIEW.md) — honest assessment of what SHIELD's crypto is and isn't.
11. Read [`docs/LEGAL.md`](docs/LEGAL.md) so you know the line.

## Design principles

- **Honesty over theater.** No feature that cannot be verified is ever shown as green.
- **Defense in depth.** Platform hardening (Lockdown Mode, Advanced Data Protection, FileVault) is the bedrock. Everything SHIELD does sits on top of that — it does not replace it.
- **Tamper-evident, not tamper-proof.** Hash-chained logs detect manipulation; they cannot prevent it on a compromised host.
- **Local-first, zero-network-egress.** Nothing in SHIELD calls out to the internet. No analytics, no telemetry, no remote state.
- **Minimal dependencies.** The Mac Sentinel uses only Node.js built-ins. The PWA uses only Web Platform APIs. Fewer dependencies = fewer supply-chain risks.
- **Your PIN never leaves your device.** PBKDF2(100k, SHA-256) → AES-256-GCM. The key lives in memory only while the app is unlocked.
- **Law-abiding.** SHIELD only observes your own devices and your own network. See [`docs/LEGAL.md`](docs/LEGAL.md).

## Repository layout

```
shield/
├── README.md                  This file
├── CLAUDE.md                  Context for future Claude Code sessions
├── docs/                      Runbooks and honest capability docs
├── mac-sentinel/              Node.js daemon for macOS (real detection)
├── pwa/                       The Progressive Web App (iPhone + Mac dashboard)
└── shortcuts/                 iOS Shortcuts setup instructions
```
