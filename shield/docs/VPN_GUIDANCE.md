# SHIELD VPN Guidance

**Short answer:** for your threat model (personal defense, not an activist in a hostile nation-state), a reputable paid VPN running on iPhone + Mac 24/7 is **net positive**. It removes your ISP and any local Wi-Fi observer from the trust set. It does not replace Lockdown Mode, SHIELD, or the hardening runbook — it is an additional layer, not an alternative. SHIELD's Mac Sentinel now detects VPN/tunnel activity and flags unexpected new tunnels so you will know if someone else's VPN is running on your device.

---

## What a VPN actually does for you

A VPN encrypts every byte that leaves your device and tunnels it through a server that the VPN provider runs. To everyone between you and that server — your ISP, your landlord's shared router, the hotel Wi-Fi, a person on the same café Wi-Fi, a rogue cell tower — your traffic looks like a single encrypted stream to one IP address. They cannot see what you're visiting, only that you're using a VPN.

That is the only thing a VPN does. It is a real protection; it's also routinely overhyped. A VPN does **not**:
- Hide your activity from Apple, Google, or the sites you log in to.
- Protect you from a compromised device.
- Prevent phishing.
- Stop malware.
- Make you anonymous.
- Remove fingerprinting by advertisers or trackers.

For SHIELD's purposes, the real wins are:
1. **LAN isolation.** On a network you don't fully trust, a VPN pushes your traffic off the local LAN immediately, so a hostile device on that LAN can't see your DNS queries, TLS SNI, or metadata.
2. **ISP opacity.** Your home ISP (and the parties that subpoena it) sees only "IP X connected to VPN Y." Useful if you have reason to believe your ISP is being asked for your logs.
3. **Untrusted Wi-Fi (hotels, airports, cafés, conferences).** The VPN is what makes those networks safe to use.
4. **Traffic shape homogenization.** If you run a VPN full-time, *all* of your outbound traffic looks like the same cipher suite and TLS fingerprint to a local observer. SHIELD-related traffic blends in. This helps with the OPSEC concern.

---

## What to use

### Tier 1 — the ones worth paying for
- **Mullvad** ([mullvad.net](https://mullvad.net)) — no account, no email. You pay with a randomly-generated 16-digit account number. Cash by mail is accepted. WireGuard by default. Independent audits. This is the gold standard for privacy-respecting personal VPNs. ~$5/month.
- **ProtonVPN** ([protonvpn.com](https://protonvpn.com)) — Switzerland, same company as ProtonMail. Strong audits. Free tier exists but paid is what you want. Supports WireGuard.
- **IVPN** ([ivpn.net](https://ivpn.net)) — similar profile to Mullvad, slightly smaller.

All three support:
- iPhone app (from the App Store) with a proper kill switch
- Mac app with a proper kill switch
- WireGuard (the modern VPN protocol)
- Multi-hop (route through two servers in different countries, which defeats single-server compromise)

### Tier 2 — acceptable but pick carefully
- Tailscale / WireGuard-direct — not a traditional VPN. Great if you want a mesh between your own devices. Not what you're looking for here.

### Do not use
- **Any "free" VPN from an App Store.** If you aren't paying, you are the product. Most free VPNs have been shown to log, sell data, inject ads, or silently install root certs.
- **Any VPN that asks for your Apple ID or wants to install a Configuration Profile.** A legitimate VPN does NOT need that. Anything wanting a profile is installing a persistent MDM foothold.
- **VPNs with jurisdiction in 5/9/14 Eyes countries** if your threat model is state-level. (This is more of an activist concern than a personal one, but worth noting.)
- **NordVPN, ExpressVPN, Surfshark.** All three are fine for torrenting, all three have been acquired or restructured in ways that make their privacy claims complicated. Not bad, but not best.

---

## Configuration checklist for a personal VPN

Once installed, on both iPhone and Mac:

1. **Enable the kill switch / Lockdown mode.** (Every reputable VPN app calls it something slightly different.) This ensures that if the tunnel drops, traffic stops — it does NOT fall back to unencrypted.
2. **Enable DNS leak protection.** The VPN should handle DNS through the tunnel. iOS Lockdown Mode already prevents most leaks, but verify.
3. **Enable IPv6 leak protection** or disable IPv6 on the device if the VPN doesn't support it.
4. **Use WireGuard** as the protocol, not OpenVPN or IKEv2.
5. **Turn on "Connect on start"** so the VPN is up before anything else is.
6. **Turn on "Reconnect on network change"** so roaming between Wi-Fi and cellular doesn't drop the tunnel.
7. **Allow LAN traffic off** (iOS) or on a per-app basis — you WANT local-network traffic to not bypass the VPN in general, BUT you may want to allow it for your own SHIELD Mac Sentinel. See below.

### If you want iPhone → Mac Sentinel to work while the VPN is on
This is tricky. A personal VPN routes *all* traffic through the VPN server by default, which means your iPhone trying to reach `https://192.168.1.5:17333` gets routed out through the VPN, never arrives at your local Mac.

Two options:
- **Option A — Allow LAN bypass for local subnets.** Most VPN clients let you exclude RFC1918 addresses (192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12) from the tunnel. Turn that on. Your iPhone will then reach the Mac directly and everything else goes through the VPN.
- **Option B — Run the Sentinel bound to 127.0.0.1 and only reach it from the Mac PWA.** The iPhone PWA remains a standalone journal + checklist + kill-switch bridge.

Option A is more convenient; Option B is cleaner. Pick based on how often you use the iPhone PWA for live Sentinel data.

---

## What happens if SOMEONE ELSE runs a VPN — on your machine

This is the interesting threat. An attacker who has gained code execution on your Mac can install their own VPN client or open a reverse tunnel to evade your observation. What they typically do:

1. **Install a launchd agent** that runs a reverse SSH tunnel or a stealth WireGuard client pointing to their infrastructure, wrapped in a plausible-looking plist.
2. **Route selected processes** (theirs, not yours) through the tunnel so that exfiltration traffic never shows up on your ISP's bill but DOES traverse the tunnel interface.
3. **Install a trusted root certificate** (via a Configuration Profile or command-line `security add-trusted-cert`) so they can MITM your own traffic without Safari complaining.

SHIELD's defenses against each of these:

- **Reverse tunnel via launchd:** the `launch_agents` collector hashes every plist on every scan, so a new or modified LaunchAgent is detected within 30 seconds and flagged CRITICAL.
- **Unexpected tunnel interface:** the `network` collector now includes `detectVpn()` which enumerates `utun*`, `tun*`, `ppp*`, and `ipsec*` interfaces, cross-references them with running processes holding utun file descriptors, and fires `VPN_TUNNEL_UP` and `VPN_PROCESS_NEW` events when a new one appears. If you run your own VPN, these events are expected and you can whitelist them. If you don't, a `VPN_TUNNEL_UP` event is a big red flag.
- **Rogue trusted root cert:** handled by the `profiles` collector and the `integrity` collector's TCC/Gatekeeper checks. An installed Configuration Profile is flagged CRITICAL, and adding a system root typically goes through Keychain Access → System → Certificates, which the hardening runbook asks you to audit manually. (Automated detection of a rogue system root is on the wishlist but requires Full Disk Access, which SHIELD does not ask for.)
- **Exfiltration traffic through the tunnel:** SHIELD's `lsof -i -n -P` connections list attributes every active socket to a process. If a process you don't recognize is holding an outbound connection through `utun0`, you see it in the LISTEN / CONNECTED list on the dashboard.

**Bottom line:** if you run a legitimate VPN, SHIELD will show you a `VPN_TUNNEL_UP` event on startup and then stop alerting about it once you whitelist it. If someone ELSE's VPN appears, SHIELD fires events you did not expect, and the aggressive-mode auto-trigger flips to 5s polling for 10 minutes so you catch whatever comes next.

---

## Do you NEED a VPN?

For your threat model — worrying about an adversary with remote and physical-proximity capability — a VPN is **useful but not critical**. In order of priority:

1. **Lockdown Mode on iPhone and Mac.** Biggest single step.
2. **Advanced Data Protection on iCloud.**
3. **Hardware security keys on Apple ID.**
4. **Configuration Profile audit on iPhone.**
5. **Rotate all accounts from a clean device.**
6. **SHIELD Mac Sentinel + PWA + hardening runbook.**
7. **A reputable paid VPN (Mullvad).**

If you already have 1-6 in place and you want more defense in depth, add a VPN. If you have not done 1-5, do those first. A VPN on top of a compromised device is cosmetic.

---

## One subtle benefit people don't talk about

A full-time VPN **homogenizes your traffic shape**. Without a VPN, an observer on your LAN can fingerprint which services you talk to by watching TLS SNI, destination IPs, packet timings, and connection durations. They can potentially identify "this user is running an intrusion-detection tool that polls a local endpoint every 10 seconds" from the timing alone.

With a VPN, all of that metadata is inside the VPN tunnel. What the LAN observer sees is: "this Mac has one outbound TLS connection to the VPN provider, constant traffic, regardless of what the user is actually doing." SHIELD's internal polling happens entirely on the loopback interface (`127.0.0.1:17333`), which never touches the VPN at all, so it's invisible regardless. But any future network-facing SHIELD feature (or any other tool you run) becomes invisible to the LAN when a VPN is up.

This is the strongest argument for running one 24/7 even when you don't strictly need the geographic unblocking or ISP opacity.
