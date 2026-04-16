# SHIELD Crypto Review

**Short answer to "is the encryption actually maxed out, or is it 2020 crypto?":**

The algorithms SHIELD ships are all current as of 2024 OWASP guidance. The one parameter that was out of date — PBKDF2 iteration count — has been bumped from 100,000 to **600,000** (in line with OWASP 2023+ and Bitwarden / 1Password defaults). Nothing SHIELD uses is on any 2024 deprecation list. Nothing is broken by any known public research.

If SHIELD could ship a dependency (it can't, on purpose), the single change a 2024 cryptographer would make is swapping PBKDF2 for **Argon2id**. Argon2id is memory-hard, which makes GPU/ASIC brute force dramatically more expensive. Node built-ins do not ship Argon2id, and Web Crypto does not ship it either. The zero-dependency constraint (which protects us from supply-chain attacks, a larger threat than a brute-force attack on a 600k-iteration PBKDF2 password) wins. If that tradeoff ever flips, Argon2id is the upgrade.

---

## What SHIELD uses and why

### Password-based key derivation
- **Algorithm:** PBKDF2-HMAC-SHA256
- **Iterations:** 600,000
- **Salt:** 32 random bytes per purpose (separate salts for ledger key, verifier, manifest HMAC key, Sentinel server auth)
- **Output:** 256-bit AES key
- **Used in:** both the Mac Sentinel (Node built-in `crypto.pbkdf2Sync`) and the PWA (Web Crypto `PBKDF2`)
- **2024 guidance:** [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) — "600,000 iterations minimum" for SHA-256. ✅
- **Limitation:** PBKDF2 is not memory-hard. An adversary with a GPU/ASIC farm can parallelize the brute-force attempt more cheaply than against Argon2id. At 600k iterations with SHA-256, a 6-digit PIN is still ~50M operations per guess, which is slow on GPU but not a wall. **Mitigation: use a 10+ character alphanumeric passphrase, not a 6-digit PIN.** SHIELD enforces a minimum of 6 but strongly recommends longer.

### Symmetric encryption (everything at rest)
- **Algorithm:** AES-256-GCM
- **Nonce size:** 96 bits, generated with `crypto.randomBytes(12)` (Sentinel) / `crypto.getRandomValues` (PWA)
- **Tag size:** 128 bits
- **AAD:** not currently used
- **Used in:** Sentinel ledger (JSONL, one line per blob), Sentinel persistent state, PWA IndexedDB stores (settings, journal, alerts, checklist, photos)
- **2024 guidance:** AES-256-GCM is FIPS-approved, NIST-approved, and has no known practical weaknesses. ✅
- **Limitation:** GCM is sensitive to nonce reuse. SHIELD generates nonces via CSPRNG per message, so reuse probability is ~2⁻⁴⁸ per key — fine for any realistic per-user volume. **If SHIELD ever ships a feature that encrypts millions of items under one key**, we'd switch to AES-256-GCM-SIV or XChaCha20-Poly1305 (which the Sentinel can add via Node's built-in `createCipheriv('chacha20-poly1305', ...)` if needed).

### Hashing
- **Algorithm:** SHA-256
- **Used in:** ledger hash chain, self-integrity manifest per-file hash, canonical-JSON hashing, cert fingerprint
- **2024 guidance:** SHA-256 has no practical collision or preimage attacks. SHA-3 is an alternative but not an improvement for these use cases. ✅

### Message authentication
- **Algorithm:** HMAC-SHA256
- **Used in:** self-integrity manifest signing
- **Key:** PBKDF2-derived with a dedicated purpose salt ("shield:manifest:v1")
- **2024 guidance:** HMAC-SHA256 is the standard. ✅

### TLS (Sentinel local HTTPS server)
- **Cert:** self-signed, generated at install via `openssl` (shipped with macOS). RSA-2048, SHA-256 signature, 10-year validity.
- **Verification:** the PWA pins the cert's SHA-256 fingerprint, cross-checked in the `/capabilities` and `/auth` response bodies on every connection. Browser-level TLS chain verification is a first line; application-level fingerprint pinning is the second.
- **2024 guidance:** RSA-2048 is still acceptable (NIST-SP-800-131A). **Upgrade path:** switch to ECDSA-P-256 or Ed25519 for slightly faster handshakes and smaller cert size. Not a security improvement in this threat model.

### Bearer tokens
- **Generation:** `crypto.randomBytes(32)` (Sentinel), via OS CSPRNG.
- **Lifetime:** 30 minutes.
- **Transport:** `Authorization: Bearer <hex>` header.
- **Storage:** server-side Map in memory, client-side in PWA app state only. Never persisted.
- **2024 guidance:** 256-bit random tokens are uncrackable in any realistic timeframe. ✅

### Timing-safe comparison
- **Algorithm:** `crypto.timingSafeEqual` (Node) / constant-time `charCodeAt` XOR loop (PWA)
- **Used in:** PIN verifier comparison, HMAC signature comparison, bearer token comparison.
- **2024 guidance:** correct. ✅

---

## Things SHIELD deliberately does NOT do

- **No custom crypto.** Every primitive comes from Node's `crypto` (OpenSSL) or Web Crypto (BoringSSL-family in Safari). SHIELD does not implement AES, SHA-256, or PBKDF2. Writing custom crypto is always worse than using the OS-shipped version.
- **No third-party crypto libraries.** No tweetnacl, no libsodium-wrappers, no Stanford JS Crypto Library, no crypto-js. Every dependency is an attack surface. A security tool cannot take that risk.
- **No server-side secrets.** No remote KMS, no cloud HSM, no API keys. Everything is local.
- **No JWTs.** JWT has a long history of implementation pitfalls (alg confusion, none-alg, key confusion). Bearer tokens from CSPRNG are simpler and safer.
- **No password-only encryption for long-term data.** Every encrypted item has a unique IV. The master key is derived fresh on every unlock, not stored.

---

## What an attacker would have to do to break SHIELD's crypto

To decrypt the ledger or journal at rest, an attacker needs **either**:
1. The user's PIN — protected by 600,000 PBKDF2 iterations, so brute-force of a short PIN requires real GPU time. A 6-digit numeric PIN is ~10^6 candidates × 600k iterations × ~20ns per hash ≈ **12 days on a single RTX 4090**. A 10-character random alphanumeric passphrase is ~62^10 candidates, which is ≈ 10^17 years on the same hardware. **Use a long passphrase.**
2. The derived AES-256 key at the moment it is resident in process memory. This requires code execution on the host, at which point you don't need SHIELD's crypto broken — you have the whole host. SHIELD's defense against this is Lockdown Mode, SIP, Gatekeeper, and the hardening runbook.

To forge a ledger entry, the attacker needs the AES key (to produce a valid encrypted blob) AND needs to know the hash-chain state, AND needs to produce a new entry whose hash chains correctly. Without the AES key, they can only truncate or delete — both of which SHIELD detects on the next verify.

To forge a self-integrity manifest, the attacker needs the HMAC key derived from the user's PIN via a dedicated salt. Without the PIN, they can modify the source files but cannot produce a matching signed manifest — so `--run` aborts with SELF_INTEGRITY_FAIL.

---

## What would change with Argon2id (if we ever allowed a dep)

```
SHIELD today:    PBKDF2-HMAC-SHA256(600k iters, 32-byte salt) → 32-byte key
SHIELD w/ Argon: Argon2id(t=4, m=64 MiB, p=2, 32-byte salt)  → 32-byte key
```

For an attacker with a GPU farm, the Argon2id parameters above are roughly 100× more expensive per guess than PBKDF2-SHA256 at 600k iters, because Argon2id forces each attempt to allocate 64 MiB of memory. GPUs have limited memory bandwidth per core, so the parallelism advantage collapses. This is why OWASP prefers Argon2id.

The upgrade path, if the zero-dependency constraint is ever relaxed: add `argon2` via npm, derive both the ledger key and verifier through Argon2id with a KDF version stamp in the verifier file. Old installs stay on PBKDF2; new installs use Argon2id; re-installs detect the version stamp and migrate on next unlock.

---

## Bottom line

SHIELD's crypto is current. The only parameter that was out of date has been fixed (100k → 600k PBKDF2). The algorithms are OS-shipped, peer-reviewed, and conservative. The design ensures that compromising the crypto requires either compromising the host or brute-forcing the user's passphrase — and the hardening runbook is specifically the answer to the first, while using a long passphrase is the answer to the second.

**If you want one upgrade that matters more than anything in this document: use a 12+ character alphanumeric passphrase, not a 6-digit PIN.** That makes the brute-force math genuinely infeasible.
