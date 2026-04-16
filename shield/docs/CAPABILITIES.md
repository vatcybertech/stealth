# SHIELD Capabilities — Brutal Honesty Edition

**Read this before you trust anything SHIELD tells you.** A security tool that lies about what it sees is worse than no tool at all.

---

## Legend

- ✅ **Real.** SHIELD actually observes this and will reliably alert.
- ⚠️ **Partial.** SHIELD can observe this in specific conditions, stated below.
- ❌ **Impossible.** The platform does not allow this. SHIELD will not pretend to.
- 🟢 **You** — a manual step you (the human) can take, not something SHIELD automates.

---

## MacBook (Mac Sentinel daemon)

### Network
| Capability | Status | Notes |
|---|---|---|
| Discover devices on your local Wi-Fi (IP, hostname, MAC via ARP cache) | ✅ | Uses `arp -an` and `dns-sd`. Polls every 30s. |
| Current SSID, BSSID, channel, signal | ✅ | Uses `airport -I` and `networksetup`. Flags SSID changes. |
| Gateway and DNS check | ✅ | Flags unexpected gateway or DNS server. |
| Open TCP/UDP listening sockets on the Mac | ✅ | Uses `lsof -i -n -P` and `netstat -an`. Flags new listeners. |
| Active outbound connections with process attribution | ✅ | Uses `lsof -i -n -P`. |
| ARP-spoofing detection (duplicate MACs, MAC/IP mapping changes) | ✅ | Tracks MAC-IP bindings across scans. |
| Subnet port scan of neighbors | ❌ | Would be noisy and legally questionable. SHIELD does not do this. |
| Deep packet inspection | ❌ | Requires root + pcap + a sniffing library. Out of scope. |

### Bluetooth
| Capability | Status | Notes |
|---|---|---|
| Enumerate paired & recently-seen BT devices with RSSI | ✅ | Uses `system_profiler SPBluetoothDataType -json`. |
| Flag new BT devices not in whitelist | ✅ | |
| Detect pairing attempts in real time | ⚠️ | Detected on next poll (up to 30s lag). |
| Raw BLE scanning / advertising packets | ❌ | Requires native CoreBluetooth + entitlements. Not available to a Node daemon. |

### System integrity & configuration
| Capability | Status | Notes |
|---|---|---|
| Lockdown Mode enabled? | ✅ | Reads `~/Library/Preferences/com.apple.security.Lockdown.plist`. |
| FileVault enabled? | ✅ | `fdesetup status`. |
| SIP (System Integrity Protection)? | ✅ | `csrutil status`. |
| Gatekeeper enabled? | ✅ | `spctl --status`. |
| Firewall enabled? | ✅ | `socketfilterfw --getglobalstate`. |
| Installed Configuration Profiles (MDM, VPN, cert trust) | ✅ | `profiles show -type configuration` — **this is one of the highest-signal checks.** If you see one you didn't install, that's your attacker. |
| LaunchAgents & LaunchDaemons (`~/Library/LaunchAgents`, `/Library/LaunchAgents`, `/Library/LaunchDaemons`) | ✅ | Snapshots & diffs every scan. Hashes plist contents so in-place modification is detected. |
| Login Items | ✅ | `osascript` against System Events. |
| Cron / `at` jobs | ✅ | `crontab -l`, `atq`. |
| Safari extensions installed | ✅ | Inventories `~/Library/Safari/Extensions/` and `Containers/.../Safari`. |
| Kernel extensions loaded | ✅ | `kextstat`. Flags unsigned or unknown. |
| Unsigned or ad-hoc signed running processes | ✅ | `ps axo pid,comm` × `codesign -dv` verification. |
| Recent logins (successful and failed), including `su`/`sudo` | ✅ | `last`, `log show --predicate 'eventMessage contains "authentication"'`. |
| Screen sharing / Remote Management service state | ✅ | Flags if `com.apple.screensharing` or ARD is active when you didn't enable it. |
| TCC (privacy) database change detection | ⚠️ | Hashes `~/Library/Application Support/com.apple.TCC/TCC.db`. Change = alert. SHIELD cannot read the contents without Full Disk Access. |

### What the Mac Sentinel cannot do
- ❌ Prevent anything. It observes, logs, and alerts. Enforcement is your job.
- ❌ See inside encrypted traffic.
- ❌ Detect a rootkit that has already patched the kernel below its view.
- ❌ Survive a physical re-image. A DFU restore is final.

---

## iPhone (PWA + Shortcuts)

### What the PWA can observe on iOS
| Capability | Status | Notes |
|---|---|---|
| Current network name (SSID) | ❌ | iOS Safari does not expose SSID to web code. A Shortcut can read it and write to a local file. |
| Devices on local Wi-Fi | ❌ | Browsers cannot probe the LAN. Not even a little. |
| MAC addresses of any device | ❌ | Not exposed to any web API, anywhere. |
| Bluetooth devices | ❌ | Web Bluetooth is not shipped in iOS Safari. |
| iOS setting changes (Safari file access, Family Sharing, etc.) | ❌ | No web API for system settings. A Shortcut can check some of them (see `docs/SHORTCUTS.md`). |
| Remote screen mirroring | ❌ | No web API. No native API either, really — this is hard even for Apple. |
| Files/screenshots deleted remotely | ❌ | No access to Photos library. |
| Push notifications | ✅ | iOS 16.4+, PWA must be installed to home screen. Use Shortcuts automations to supplement. |
| Your own journal and checklist state | ✅ | Encrypted IndexedDB. |
| Kill switch (via Shortcut bridge) | ✅ | Tap button → `shortcuts://run-shortcut?name=SHIELD%20Kill%20Switch` → Shortcut toggles Airplane/Wi-Fi/BT. You confirm the Shortcut run on first use. |
| Read status from Mac Sentinel over same Wi-Fi | ⚠️ | Works when iPhone and Mac are on the same network, reachable on `https://<mac-local-ip>:<port>`. Uses PIN-derived bearer token. |

### The iPhone honest summary
The PWA on iPhone is:
1. An **encrypted journal** for you to log what you see with your own eyes.
2. A **dashboard** for what the Mac Sentinel sees.
3. A **hardening checklist** that walks you through Lockdown Mode, Advanced Data Protection, Stolen Device Protection, Configuration Profile review, Family Sharing audit.
4. A **kill-switch bridge** that launches an iOS Shortcut to toggle radios.

It is not an intrusion detector on iOS. That is not a limitation of SHIELD; it is a limitation of iOS Safari, which exists for good reasons.

---

## Things that protect you that are NOT in this repo

These matter more than any code in SHIELD. See [`HARDENING.md`](HARDENING.md) for the full runbook.

1. 🟢 **Lockdown Mode** on iPhone and Mac.
2. 🟢 **Advanced Data Protection** on iCloud.
3. 🟢 **Stolen Device Protection** on iPhone.
4. 🟢 **Hardware security key** on your Apple ID.
5. 🟢 **DFU restore** of any device you suspect is compromised.
6. 🟢 **Signing out every device** from appleid.apple.com using a clean computer.
7. 🟢 **Deleting any Configuration Profile** you did not install yourself.
8. 🟢 **Auditing Family Sharing** — a common remote-control vector.

SHIELD's job is to make it obvious when something on those fronts has changed. SHIELD's job is not to replace them.
