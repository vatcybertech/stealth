# SHIELD Legal Boundaries — Ohio, USA

**This is not legal advice.** It is a plain-language summary of the laws that matter for a personal defensive security tool operated by a private individual in Ohio. If you are ever in doubt about a specific action, consult an attorney before you take it.

SHIELD is designed to keep you inside these lines automatically. This document exists so you understand *why* it draws them where it does.

---

## The short version

You are allowed to:
- ✅ Observe, monitor, and log **your own devices**.
- ✅ Observe and log the state of **your own network** (Wi-Fi, router, LAN).
- ✅ Record notifications and events that **your device receives** (it is your device receiving them).
- ✅ Enumerate devices that **voluntarily announce themselves** on your network — ARP, mDNS, Bluetooth advertising — because they are broadcasting to whoever is listening.
- ✅ Save screenshots and photos of your own screens.
- ✅ Maintain a contemporaneous, hash-chained journal of everything you observe yourself.
- ✅ Share all of the above with law enforcement or a lawyer.

You are NOT allowed to:
- ❌ Access, probe, or attempt to exploit a device you do not own — even if it is attacking you. "Hacking back" is illegal under the federal Computer Fraud and Abuse Act (18 U.S.C. § 1030) and Ohio's Unauthorized Use of Computer, Cable, or Telecommunication Property statute (ORC § 2913.04). It does not matter that they hit you first. Self-defense doctrine does not apply to computers.
- ❌ Intercept the contents of a communication you are not a party to. This is federal wiretap law (18 U.S.C. § 2511). Observing that your router has a connection to IP X at time Y is fine (it's your router's own logs). Capturing and reading the payload of a neighbor's Wi-Fi traffic is not.
- ❌ Record a two-party phone call or in-person conversation without at least one party's consent. Ohio is a **one-party consent state** (ORC § 2933.52), which means you can record any conversation *you are a participant in*. You cannot record conversations you are not part of.
- ❌ Plant surveillance devices on someone else's property or in places where they have a reasonable expectation of privacy.
- ❌ Scan, port-probe, or otherwise touch devices on a network that is not yours. Joining a café Wi-Fi gives you permission to use it, not to scan other guests.

---

## How SHIELD stays on the right side of this

- The **Mac Sentinel** only observes your own Mac and your own network. It uses `arp -an` (reads the kernel's local ARP cache, which every device on your LAN has voluntarily populated by announcing itself), `system_profiler SPBluetoothDataType -json` (reads the Mac's own BT stack state), and filesystem/launchctl inspection of your own machine. It does **not** port-scan neighbors, packet-sniff, or touch any device you don't own.
- The **PWA** observes only your own journal, the Mac Sentinel's local API, and the iOS Shortcuts you explicitly run. It makes no outbound connections at all.
- SHIELD **does not** intercept traffic, crack encryption, or attempt to deanonymize anyone.
- SHIELD **does not** transmit anything off your devices. All logs, exports, and evidence reports go only where you, personally, send them.
- SHIELD **logs everything it does** in a tamper-evident ledger so you can demonstrate to anyone — investigator, lawyer, judge — that you stayed inside the line.

---

## What "observing an attacker" looks like legally

If someone successfully compromises a device you own, every byte they sent, every file they touched, and every connection they made is now happening **on your property**. The logs your own device keeps of those events are yours. You can share them with whomever you want. You can build a case from them. That is exactly what SHIELD's Sentinel ledger is designed to produce: a cryptographically integrity-checked record of activity **on your own machine**.

The line you cannot cross is the reverse direction: you do not get to reach back into the attacker's device, even to identify them, even to "just look." If you want to know who they are, you hand the logs to law enforcement and they use legal process.

---

## Evidentiary considerations

If you ever want SHIELD's ledger to support a legal claim:

1. **Chain of custody matters.** From the moment you export a ledger snapshot, treat it like evidence: do not edit it, keep hashes, keep the original file, note when and where you produced it.
2. **Contemporaneous records are stronger than reconstructed ones.** A journal entry written at the moment you observe something is far more valuable than one written a week later from memory. This is why the PWA's journal emphasizes "log it now, process it later."
3. **Digital evidence requires authentication.** The hash chain in the SHIELD ledger is specifically designed to make authentication easy: any investigator can recompute the chain and verify that the exported file was not tampered with after export.
4. **Do not clean up before exporting.** If you notice a strange file or process, resist the urge to delete it. Photograph it, screenshot the SHIELD alert, export the ledger, *then* decide whether to delete — after consulting someone qualified.
5. **Involve professionals early.** Evidence that is rock solid technically can be thrown out procedurally if it isn't handled right. If you think this is headed toward a complaint or prosecution, talk to Access Now or an attorney before you start mass-deleting or mass-reinstalling.

---

## What to say and not say publicly

- Do not name suspected attackers publicly. Defamation claims are real, and you rarely have proof sufficient to meet that bar.
- Do not post your ledger exports publicly unless you have redacted anything that identifies third parties. The goal of an export is to hand it to a specific investigator, not to crowdsource the investigation.
- Do not taunt the attacker if you suspect they are watching. Calm observation is a stronger posture than confrontation.

---

## Resources

- [Access Now Digital Security Helpline](https://www.accessnow.org/help/) — free, confidential, experienced with at-risk individuals.
- [EFF Surveillance Self-Defense](https://ssd.eff.org)
- [FBI IC3 (Internet Crime Complaint Center)](https://www.ic3.gov/)
- [Ohio Attorney General — Identity Theft Unit](https://www.ohioattorneygeneral.gov/Individuals-and-Families/Consumers/Identity-Theft-Unit)
- For criminal referral in Ohio: local police for physical-proximity / stalking issues; FBI field office (Cleveland, Cincinnati, or Columbus) for anything with interstate or nation-state flavor.

---

**Bottom line:** you have a lot of rights to defend your own property. You have very few rights to reach beyond it. SHIELD helps you use the first without touching the second.
