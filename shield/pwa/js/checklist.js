// SHIELD PWA — hardening checklist data model.
//
// Mirrors docs/HARDENING.md. Each item has an id, a phase, a short title,
// a description, and a checked state stored in IndexedDB under the
// `checklist` store (encrypted).

'use strict';

(function (window) {
  const ITEMS = [
    // Phase 0 — from a known-clean device
    { id: 'p0-rotate-apple-id',    phase: 'Phase 0 — from a clean device', title: 'Change Apple ID password',          desc: 'From a different, known-clean device. Use a 16+ character password stored in a manager.' },
    { id: 'p0-signout-devices',    phase: 'Phase 0 — from a clean device', title: 'Sign out every Apple ID device',    desc: 'appleid.apple.com → Devices → sign out anything you do not recognize.' },
    { id: 'p0-trusted-numbers',    phase: 'Phase 0 — from a clean device', title: 'Review trusted phone numbers',      desc: 'Remove any number you do not control.' },
    { id: 'p0-family-sharing',     phase: 'Phase 0 — from a clean device', title: 'Review Family Sharing',             desc: 'Remove unknown members. Leave the family if it isn\'t yours.' },

    // Phase 1 — iPhone
    { id: 'p1-ios-update',         phase: 'Phase 1 — iPhone', title: 'Update to latest iOS',                desc: 'Settings → General → Software Update.' },
    { id: 'p1-lockdown-mode',      phase: 'Phase 1 — iPhone', title: 'Enable Lockdown Mode',                desc: 'Settings → Privacy & Security → Lockdown Mode → Turn On & Restart. Highest single-step impact.' },
    { id: 'p1-stolen-device',      phase: 'Phase 1 — iPhone', title: 'Enable Stolen Device Protection',    desc: 'Settings → Face ID & Passcode → Stolen Device Protection → On.' },
    { id: 'p1-profiles',           phase: 'Phase 1 — iPhone', title: 'Review VPN & Device Management',     desc: 'Settings → General → VPN & Device Management. Delete any profile you did not install yourself.' },
    { id: 'p1-airdrop',            phase: 'Phase 1 — iPhone', title: 'AirDrop → Off or Contacts Only',     desc: 'Settings → General → AirDrop.' },
    { id: 'p1-bluetooth-off',      phase: 'Phase 1 — iPhone', title: 'Bluetooth off when not in use',      desc: 'Settings → Bluetooth → Off.' },
    { id: 'p1-analytics-off',      phase: 'Phase 1 — iPhone', title: 'Turn off Analytics sharing',         desc: 'Settings → Privacy & Security → Analytics & Improvements → Off.' },
    { id: 'p1-adp',                phase: 'Phase 1 — iPhone', title: 'Enable Advanced Data Protection',    desc: 'Settings → [Name] → iCloud → Advanced Data Protection → On. End-to-end encrypts iCloud.' },
    { id: 'p1-security-keys',      phase: 'Phase 1 — iPhone', title: 'Add hardware security keys',         desc: 'Settings → Sign-In & Security → Security Keys. Use two YubiKeys (one primary, one backup).' },
    { id: 'p1-imessage-contacts',  phase: 'Phase 1 — iPhone', title: 'iMessage Contact Key Verification',  desc: 'Settings → Messages → iMessage Contact Key Verification → On.' },
    { id: 'p1-safari-extensions',  phase: 'Phase 1 — iPhone', title: 'Safari extensions — remove unknown', desc: 'Settings → Safari → Extensions.' },
    { id: 'p1-keyboards',          phase: 'Phase 1 — iPhone', title: 'Remove third-party keyboards',       desc: 'Settings → General → Keyboard → Keyboards.' },

    // Phase 2 — Mac
    { id: 'p2-mac-update',         phase: 'Phase 2 — MacBook', title: 'Update to latest macOS',            desc: 'System Settings → General → Software Update.' },
    { id: 'p2-mac-lockdown',       phase: 'Phase 2 — MacBook', title: 'Enable Lockdown Mode',              desc: 'System Settings → Privacy & Security → Lockdown Mode.' },
    { id: 'p2-filevault',          phase: 'Phase 2 — MacBook', title: 'Enable FileVault',                  desc: 'Store recovery key physically — NOT in iCloud if iCloud may be compromised.' },
    { id: 'p2-firewall',           phase: 'Phase 2 — MacBook', title: 'Firewall on + Stealth + Block all', desc: 'System Settings → Privacy & Security → Firewall → Options.' },
    { id: 'p2-gatekeeper',         phase: 'Phase 2 — MacBook', title: 'Gatekeeper set to App Store + identified', desc: 'System Settings → Privacy & Security → Gatekeeper.' },
    { id: 'p2-sharing-off',        phase: 'Phase 2 — MacBook', title: 'Turn off ALL Sharing services',     desc: 'System Settings → General → Sharing. Every toggle off.' },
    { id: 'p2-login-items',        phase: 'Phase 2 — MacBook', title: 'Review Login Items & Background',  desc: 'System Settings → General → Login Items & Extensions.' },
    { id: 'p2-mac-profiles',       phase: 'Phase 2 — MacBook', title: 'Remove unknown Configuration Profiles', desc: 'System Settings → Privacy & Security → Profiles.' },
    { id: 'p2-privacy-permissions',phase: 'Phase 2 — MacBook', title: 'Audit privacy permissions',         desc: 'Full Disk Access / Accessibility / Input Monitoring / Screen Recording / Automation — remove unfamiliar apps.' },
    { id: 'p2-terminal-checks',    phase: 'Phase 2 — MacBook', title: 'Terminal: verify SIP, FileVault, Firewall, Gatekeeper', desc: 'Commands listed in docs/HARDENING.md §Phase 2 step 10.' },
    { id: 'p2-mac-password',       phase: 'Phase 2 — MacBook', title: 'Change Mac login password',        desc: 'Use a long passphrase — do not reuse your Apple ID password.' },
    { id: 'p2-safari-ext',         phase: 'Phase 2 — MacBook', title: 'Safari extensions — remove unknown', desc: 'Safari → Settings → Extensions.' },
    { id: 'p2-launch-manual',      phase: 'Phase 2 — MacBook', title: 'ls LaunchAgents and LaunchDaemons', desc: 'One-time manual inspection of ~/Library/LaunchAgents, /Library/LaunchAgents, /Library/LaunchDaemons.' },

    // Phase 3 — Network
    { id: 'p3-router-admin',       phase: 'Phase 3 — Network', title: 'Change router admin password',     desc: 'Not the Wi-Fi password — the admin login.' },
    { id: 'p3-router-firmware',    phase: 'Phase 3 — Network', title: 'Update router firmware',           desc: 'From the manufacturer\'s site.' },
    { id: 'p3-wps-upnp-off',       phase: 'Phase 3 — Network', title: 'Disable WPS, UPnP, WAN admin',     desc: '' },
    { id: 'p3-wpa3',               phase: 'Phase 3 — Network', title: 'Wi-Fi: WPA3 (or WPA2-AES)',        desc: 'Never WEP, never mixed mode.' },
    { id: 'p3-wifi-password',      phase: 'Phase 3 — Network', title: 'Rotate Wi-Fi password',            desc: 'Long passphrase.' },
    { id: 'p3-baseline-devices',   phase: 'Phase 3 — Network', title: 'Record device list from router',   desc: 'Ground truth for SHIELD\'s new-device alerts.' },
    { id: 'p3-guest-off',          phase: 'Phase 3 — Network', title: 'Guest network off (or isolated)',  desc: '' },
    { id: 'p3-dns',                phase: 'Phase 3 — Network', title: 'Set router DNS to 9.9.9.9 or 1.1.1.1', desc: 'Privacy-respecting resolvers.' },

    // Phase 4 — other accounts
    { id: 'p4-google',              phase: 'Phase 4 — other accounts', title: 'Rotate Google account',        desc: 'Password + 2FA + review sessions + OAuth app audit.' },
    { id: 'p4-github',              phase: 'Phase 4 — other accounts', title: 'Rotate GitHub account',        desc: 'Add security key. Review PATs + SSH keys.' },
    { id: 'p4-bank',                phase: 'Phase 4 — other accounts', title: 'Rotate bank/finance accounts', desc: '' },
    { id: 'p4-email',               phase: 'Phase 4 — other accounts', title: 'Rotate email providers',       desc: '' },
    { id: 'p4-registrar',           phase: 'Phase 4 — other accounts', title: 'Rotate domain registrar',      desc: '' },
    { id: 'p4-oauth-audit',         phase: 'Phase 4 — other accounts', title: 'Revoke unknown OAuth apps',    desc: 'Google, GitHub, Apple, etc.' },

    // Phase 5 — iPhone Exorcism (the "new phone without DFU" sequence)
    { id: 'p5-local-backup',        phase: 'Phase 5 — iPhone Exorcism', title: 'Local encrypted Finder backup first', desc: 'Plug into Mac, Finder, Encrypt Local Backup, Back Up Now. Rollback point; not iCloud.' },
    { id: 'p5-purge-profiles',      phase: 'Phase 5 — iPhone Exorcism', title: 'Remove every Configuration Profile', desc: 'Settings → General → VPN & Device Management. Anything you did not install → remove.' },
    { id: 'p5-purge-calendars',     phase: 'Phase 5 — iPhone Exorcism', title: 'Remove unknown subscribed calendars', desc: 'Settings → Calendar → Accounts.' },
    { id: 'p5-purge-keyboards',     phase: 'Phase 5 — iPhone Exorcism', title: 'Remove every third-party keyboard',  desc: 'Settings → General → Keyboard → Keyboards → Edit.' },
    { id: 'p5-purge-safari-ext',    phase: 'Phase 5 — iPhone Exorcism', title: 'Remove every Safari extension',      desc: 'Settings → Safari → Extensions.' },
    { id: 'p5-purge-shortcuts',     phase: 'Phase 5 — iPhone Exorcism', title: 'Remove Shortcuts you did not create', desc: 'Shortcuts app → review every shortcut and automation.' },
    { id: 'p5-purge-widgets',       phase: 'Phase 5 — iPhone Exorcism', title: 'Remove unknown widgets',             desc: 'Long-press Home Screen → +.' },
    { id: 'p5-purge-shares',        phase: 'Phase 5 — iPhone Exorcism', title: 'Leave shared albums/notes/reminders you did not create', desc: 'Photos, Notes, Reminders, Files.' },
    { id: 'p5-purge-bt',            phase: 'Phase 5 — iPhone Exorcism', title: 'Forget all unknown Bluetooth devices', desc: 'Settings → Bluetooth → (i) → Forget.' },
    { id: 'p5-airdrop',             phase: 'Phase 5 — iPhone Exorcism', title: 'AirDrop / Handoff / AirPlay off',   desc: 'Settings → General → AirDrop + AirPlay & Handoff.' },
    { id: 'p5-screen-time',         phase: 'Phase 5 — iPhone Exorcism', title: 'Screen Time passcode cleared/rotated', desc: 'Settings → Screen Time → Change Screen Time Passcode.' },
    { id: 'p5-face-id-reset',       phase: 'Phase 5 — iPhone Exorcism', title: 'Reset Face ID / audit enrolled fingers', desc: 'Settings → Face ID & Passcode → Reset → re-enroll only you.' },
    { id: 'p5-alphanum-passcode',   phase: 'Phase 5 — iPhone Exorcism', title: 'Passcode → 14+ char alphanumeric',  desc: 'Settings → Face ID & Passcode → Change Passcode → Passcode Options.' },
    { id: 'p5-unknown-apps',        phase: 'Phase 5 — iPhone Exorcism', title: 'Delete every app you do not recognize', desc: 'Settings → General → iPhone Storage.' },
    { id: 'p5-clear-safari',        phase: 'Phase 5 — iPhone Exorcism', title: 'Safari → Clear History and Website Data', desc: 'Purges all Safari session tokens.' },
    { id: 'p5-forget-wifi',         phase: 'Phase 5 — iPhone Exorcism', title: 'Forget all saved Wi-Fi except home', desc: 'Settings → Wi-Fi → Edit → Known Networks.' },
    { id: 'p5-imessage-toggle',     phase: 'Phase 5 — iPhone Exorcism', title: 'iMessage off → wait 10s → back on', desc: 'Forces iMessage re-registration.' },
    { id: 'p5-facetime-toggle',     phase: 'Phase 5 — iPhone Exorcism', title: 'FaceTime off → wait 10s → back on', desc: 'Forces FaceTime re-registration.' },
    { id: 'p5-mail-readd',          phase: 'Phase 5 — iPhone Exorcism', title: 'Delete and re-add every Mail account', desc: 'Settings → Mail → Accounts. Rotate OAuth/IMAP tokens on each provider first.' },
    { id: 'p5-app-sessions',        phase: 'Phase 5 — iPhone Exorcism', title: 'Sign out of every third-party app',  desc: 'Banking, social, dev tools, password manager — each one individually.' },
    { id: 'p5-rev-app-pw',          phase: 'Phase 5 — iPhone Exorcism', title: 'Revoke all App-Specific Passwords',  desc: 'appleid.apple.com → Sign-In and Security.' },
    { id: 'p5-icloud-signout',      phase: 'Phase 5 — iPhone Exorcism', title: 'Full iCloud sign-out and re-sign-in', desc: 'Keep on-device copies of what you need. Then sign in fresh, add both YubiKeys, ADP on, iMessage Contact Key Verification on. Closest thing to new phone without DFU.' },
    { id: 'p5-wallet-reprovision', phase: 'Phase 5 — iPhone Exorcism', title: 'Wallet: remove and re-add every card', desc: 'Rotates the device-specific token with each bank.' },
    { id: 'p5-baseline-snapshots', phase: 'Phase 5 — iPhone Exorcism', title: 'Record post-exorcism baseline',      desc: 'Screenshot profile list, keyboard list, BT list, Wi-Fi list, app list, Shortcuts list → attach to SHIELD journal.' },
    { id: 'p5-accessories-off',    phase: 'Phase 5 — iPhone Exorcism', title: 'Allow Accessories when locked → Off', desc: 'Settings → Face ID & Passcode → Accessories → Off.' },
    { id: 'p5-siri-lockscreen',    phase: 'Phase 5 — iPhone Exorcism', title: 'Siri / Notification Center / Today View off on lock screen', desc: 'Settings → Face ID & Passcode → Allow Access When Locked.' },

    // Phase 6 — ongoing OPSEC
    { id: 'p6-notifications',       phase: 'Phase 6 — OPSEC', title: 'Lock-screen notification previews → Never', desc: 'Settings → Notifications → Show Previews → When Unlocked or Never.' },
    { id: 'p6-back-tap',            phase: 'Phase 6 — OPSEC', title: 'Back Tap runs Kill Switch Shortcut',  desc: 'Settings → Accessibility → Touch → Back Tap → Triple Tap → Run Shortcut → Kill Switch.' },
    { id: 'p6-pwa-rename',          phase: 'Phase 6 — OPSEC', title: 'PWA display name is generic',          desc: 'Rename in Add to Home Screen dialog. Default "SHIELD" is identifying.' },
    { id: 'p6-shortcut-labels',     phase: 'Phase 6 — OPSEC', title: 'Home-screen Shortcut icons have neutral labels', desc: 'When adding to Home Screen, use generic titles. Internal Shortcut names stay the same.' },
    { id: 'p6-long-passphrase',     phase: 'Phase 6 — OPSEC', title: 'SHIELD PIN is a 12+ char passphrase', desc: 'Makes PBKDF2 brute-force math infeasible. See docs/CRYPTO_REVIEW.md.' },
    { id: 'p6-vpn',                 phase: 'Phase 6 — OPSEC', title: 'Reputable VPN on iPhone + Mac 24/7', desc: 'Mullvad or Proton. Kill-switch on. Allow LAN for Sentinel if needed. See docs/VPN_GUIDANCE.md.' },
    { id: 'p6-private-discussion',  phase: 'Phase 6 — OPSEC', title: 'Do not discuss SHIELD publicly',      desc: 'No tweets, no public GitHub, no Slack DMs unless E2EE. An informed attacker adjusts.' },
  ];

  window.SHIELD_CHECKLIST = ITEMS;
})(window);
