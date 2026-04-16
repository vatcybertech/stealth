// SHIELD Mac Sentinel — honeypot file manager.
//
// Creates tempting-looking decoy files at known locations. A collector
// then polls their state every scan cycle; any change in hash, size,
// mtime, or atime is surfaced as a honeypot event. Real users don't
// open hidden backup files they didn't create, and they don't touch
// "bank_accounts.csv" they've never seen before. False-positive rate
// should be essentially zero.
//
// Locations (all under the user's home — NO privileged filesystem
// writes, NO real SMB share toggling — see docs/HONEYPOTS.md for the
// optional advanced SMB setup):
//
//   ~/Desktop/.credentials_backup           hidden file, fake SSH keys
//   ~/Desktop/Recovery_Codes.txt            fake 2FA recovery codes
//   ~/Documents/Financial_Records/tax_returns_2025.pdf
//   ~/Documents/Financial_Records/bank_accounts.csv
//   ~/Documents/Financial_Records/passwords_backup.txt
//
// Each file has plausible-looking but entirely fake content. The
// content includes a placeholder for a DNS canary URL — if the
// attacker actually USES the fake credentials, the canary fires
// externally and notifies you. Set up via docs/HONEYPOTS.md.

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { sha256 } = require('./crypto');

// Placeholder. Users replace this with their own canarytokens.org URL
// via config/defaults.json → honeypots.canaryUrl. Documented in
// docs/HONEYPOTS.md.
const DEFAULT_CANARY = 'https://canarytokens.org/placeholder-replace-me';

/**
 * Minimal valid PDF bytes. Any viewer will open it and see a blank
 * page — enough to convince an attacker there's something to steal.
 */
const EMPTY_PDF = Buffer.from(
  '%PDF-1.4\n' +
  '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
  '2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n' +
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj\n' +
  '4 0 obj<</Length 0>>stream\nendstream\nendobj\n' +
  'xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000050 00000 n \n0000000093 00000 n \n0000000146 00000 n \n' +
  'trailer<</Size 5/Root 1 0 R>>\nstartxref\n185\n%%EOF\n',
  'binary',
);

function bankCsvContent(canary) {
  return `Account,Bank,Balance,LastAccess,Notes
Checking-4421,Huntington,58427.19,2025-10-15,primary
Savings-8831,Chase,214560.44,2025-10-14,emergency
Brokerage-2077,Fidelity,612819.02,2025-10-13,retirement

# Internal webhook (do not share):
# ${canary}
`;
}

function sshKeyContent(canary) {
  // Syntactically plausible but entirely fake ed25519 private key.
  return `-----BEGIN OPENSSH PRIVATE KEY-----
${Buffer.from('SHIELD-HONEYPOT-DO-NOT-USE-THIS-IS-A-FAKE-KEY-' + Date.now(), 'utf8').toString('base64')}
${Buffer.from('If you are reading this, access is being logged via ' + canary, 'utf8').toString('base64')}
-----END OPENSSH PRIVATE KEY-----

# Associated webhook: ${canary}
# API token: sk-live-${Buffer.from('fake-' + Date.now()).toString('hex').slice(0, 32)}
`;
}

function recoveryCodesContent(canary) {
  return `APPLE ID RECOVERY CODES
Generated: 2025-10-01

Do not share these. If lost, contact support via ${canary}

  1. 6f4b-1a9c-d8e2
  2. 23fa-5b7d-40e9
  3. 9102-af6e-bb45
  4. 73de-2c41-88a0
  5. 5e0a-f3b9-1d74
  6. c419-0876-a3e1
  7. 8f21-4bc5-9e02
  8. 206d-7a18-fe39
  9. b45e-9103-2c78
 10. 3a8f-d520-e16c
`;
}

function passwordsContent(canary) {
  return `# Personal password backup
# Webhook for sync: ${canary}

gmail | primary.user@gmail.com | Tr@vis#2024!
apple | primary.user@icloud.com | Sunset\\Mountain72!
chase | primary_user | Jfk!aRpQ9238
huntington | primary_user | WorkCalm!0921
github | primary-user | gh_pat_${Buffer.from('FAKE-' + Date.now()).toString('hex').slice(0, 36)}
aws | root | AKIA${Buffer.from('FAKE' + Date.now()).toString('hex').slice(0, 16).toUpperCase()}
vpn | primary_user | R0uter#Passage!
`;
}

function taxPdfContent() { return EMPTY_PDF; }

function makeHoneypotDefinitions(canary) {
  const home = os.homedir();
  return [
    {
      id: 'desk-creds',
      path: path.join(home, 'Desktop', '.credentials_backup'),
      content: () => Buffer.from(sshKeyContent(canary), 'utf8'),
      severity: 'CRITICAL',
      label: 'Desktop credentials_backup (hidden)',
    },
    {
      id: 'desk-recovery',
      path: path.join(home, 'Desktop', 'Recovery_Codes.txt'),
      content: () => Buffer.from(recoveryCodesContent(canary), 'utf8'),
      severity: 'CRITICAL',
      label: 'Desktop Recovery_Codes.txt',
    },
    {
      id: 'fin-tax',
      path: path.join(home, 'Documents', 'Financial_Records', 'tax_returns_2025.pdf'),
      content: () => taxPdfContent(),
      severity: 'CRITICAL',
      label: 'Financial_Records/tax_returns_2025.pdf',
    },
    {
      id: 'fin-bank',
      path: path.join(home, 'Documents', 'Financial_Records', 'bank_accounts.csv'),
      content: () => Buffer.from(bankCsvContent(canary), 'utf8'),
      severity: 'CRITICAL',
      label: 'Financial_Records/bank_accounts.csv',
    },
    {
      id: 'fin-pw',
      path: path.join(home, 'Documents', 'Financial_Records', 'passwords_backup.txt'),
      content: () => Buffer.from(passwordsContent(canary), 'utf8'),
      severity: 'CRITICAL',
      label: 'Financial_Records/passwords_backup.txt',
    },
  ];
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true, mode: 0o700 });
}

function ensureHoneypotsExist(canary = DEFAULT_CANARY) {
  const defs = makeHoneypotDefinitions(canary);
  const created = [];
  for (const d of defs) {
    try {
      ensureDir(path.dirname(d.path));
      if (!fs.existsSync(d.path)) {
        fs.writeFileSync(d.path, d.content(), { mode: 0o600 });
        created.push(d.id);
      }
    } catch {}
  }
  return { defs, created };
}

function readHoneypotState(defs) {
  const states = [];
  for (const d of defs) {
    const state = { id: d.id, label: d.label, path: d.path, severity: d.severity };
    try {
      if (!fs.existsSync(d.path)) { state.exists = false; states.push(state); continue; }
      state.exists = true;
      const stat = fs.statSync(d.path);
      state.size = stat.size;
      state.mtime = stat.mtime.toISOString();
      state.atime = stat.atime.toISOString();
      const buf = fs.readFileSync(d.path);
      state.hash = sha256(buf);
    } catch (err) {
      state.error = err.message;
    }
    states.push(state);
  }
  return states;
}

module.exports = {
  DEFAULT_CANARY,
  makeHoneypotDefinitions,
  ensureHoneypotsExist,
  readHoneypotState,
};
