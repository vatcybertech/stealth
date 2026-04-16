// Honeypot collector — reads the current state of every honeypot file
// on each scan cycle so the analyzer can diff hash, size, mtime, and
// atime against the previous snapshot.
//
// File creation + content is managed by lib/honeypots.js. This
// collector never writes anything — it only reads state.

'use strict';

const honeypots = require('../honeypots');

async function collect(canaryUrl) {
  // Make sure the files exist (no-op after first run).
  const { defs } = honeypots.ensureHoneypotsExist(canaryUrl);
  const states = honeypots.readHoneypotState(defs);
  return {
    honeypots: states,
    count: states.length,
    collectedAt: new Date().toISOString(),
  };
}

module.exports = { collect };
