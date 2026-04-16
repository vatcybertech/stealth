// SHIELD Mac Sentinel — safe shell exec helper
//
// We never interpolate user input into a shell command. Everything goes
// through execFile() with an explicit argv array so there is no shell
// metacharacter expansion and no injection surface.

'use strict';

const { execFile } = require('child_process');

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_BUFFER = 8 * 1024 * 1024; // 8 MB — large enough for `log show` etc.

/**
 * Run an external program and return its stdout.
 * @param {string} cmd  path or name of the executable
 * @param {string[]} args
 * @param {{timeout?: number, maxBuffer?: number, env?: object}} [opts]
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
function run(cmd, args = [], opts = {}) {
  return new Promise((resolve) => {
    execFile(
      cmd,
      args,
      {
        timeout: opts.timeout ?? DEFAULT_TIMEOUT_MS,
        maxBuffer: opts.maxBuffer ?? DEFAULT_MAX_BUFFER,
        env: opts.env ?? process.env,
        windowsHide: true,
      },
      (err, stdout, stderr) => {
        resolve({
          stdout: stdout?.toString('utf8') ?? '',
          stderr: stderr?.toString('utf8') ?? '',
          code: err ? (err.code ?? 1) : 0,
          error: err ? (err.message || String(err)) : null,
        });
      },
    );
  });
}

/**
 * Run and return stdout lines as an array (trimmed, non-empty).
 */
async function runLines(cmd, args = [], opts = {}) {
  const { stdout } = await run(cmd, args, opts);
  return stdout.split('\n').map(l => l.trim()).filter(Boolean);
}

/**
 * Try to parse JSON stdout, returning null on failure.
 */
async function runJson(cmd, args = [], opts = {}) {
  const { stdout } = await run(cmd, args, opts);
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

module.exports = { run, runLines, runJson };
