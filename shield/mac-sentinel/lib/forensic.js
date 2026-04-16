// SHIELD Mac Sentinel — first-run forensic sweep.
//
// Runs before --setup, before any baseline. Assumes the Mac is ALREADY
// compromised and does a deep one-time inventory of every attacker-
// relevant surface. Output is printed to the console with color coding
// (red for anything that needs immediate attention) and optionally
// written to the ledger as a single INITIAL_FORENSIC_SWEEP entry.
//
// This is the "is someone already here?" check.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { run } = require('./shell');

// ANSI color helpers. These respect NO_COLOR and non-TTY stdout.
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const C = {
  red:    (s) => useColor ? `\x1b[31;1m${s}\x1b[0m` : s,
  green:  (s) => useColor ? `\x1b[32;1m${s}\x1b[0m` : s,
  yellow: (s) => useColor ? `\x1b[33;1m${s}\x1b[0m` : s,
  gray:   (s) => useColor ? `\x1b[90m${s}\x1b[0m`   : s,
  bold:   (s) => useColor ? `\x1b[1m${s}\x1b[0m`    : s,
  dim:    (s) => useColor ? `\x1b[2m${s}\x1b[0m`    : s,
};

function print(label, level, detail = null) {
  const tag = level === 'CRITICAL' ? C.red('[CRITICAL]')
            : level === 'HIGH'     ? C.red('[HIGH]')
            : level === 'MEDIUM'   ? C.yellow('[MEDIUM]')
            : level === 'LOW'      ? C.yellow('[LOW]')
            : level === 'OK'       ? C.green('[OK]')
            :                        C.gray('[INFO]');
  process.stdout.write(`${tag} ${label}`);
  if (detail) process.stdout.write(C.gray(' — ' + detail));
  process.stdout.write('\n');
}

function header(title) {
  process.stdout.write('\n' + C.bold(title) + '\n' + C.gray('─'.repeat(Math.max(20, title.length))) + '\n');
}

// ──────────────────────────────────────────────────────────────────────────
// Individual sweep checks. Each returns { label, level, detail, findings }
// so the caller can aggregate them into a single ledger entry.
// ──────────────────────────────────────────────────────────────────────────

async function sweepSockets() {
  const res = await run('/usr/sbin/lsof', ['-i', '-n', '-P', '-l'], { timeout: 15000 });
  if (res.code !== 0) return { label: 'Sockets', level: 'INFO', detail: 'lsof unavailable', findings: [] };
  const lines = res.stdout.split('\n').slice(1).filter(Boolean);
  const listeners = [];
  const established = [];
  for (const raw of lines) {
    const parts = raw.trim().split(/\s+/);
    if (parts.length < 9) continue;
    const state = /\((LISTEN|ESTABLISHED|CONNECTED)\)/.exec(raw);
    if (!state) continue;
    const entry = { command: parts[0], pid: parts[1], user: parts[2], proto: parts[7], name: parts.slice(8).join(' '), state: state[1] };
    if (state[1] === 'LISTEN') listeners.push(entry);
    else established.push(entry);
  }
  const level = listeners.length > 20 ? 'MEDIUM' : 'INFO';
  return {
    label: `Open sockets — ${listeners.length} listening, ${established.length} established`,
    level,
    detail: null,
    findings: { listeners, established },
  };
}

async function sweepProcessCodesign() {
  const ps = await run('/bin/ps', ['axo', 'pid,user,comm'], { timeout: 6000 });
  if (ps.code !== 0) return { label: 'Process codesign', level: 'INFO', detail: 'ps failed', findings: [] };
  const unique = new Set();
  for (const raw of ps.stdout.split('\n').slice(1)) {
    const m = raw.trim().match(/^\d+\s+\S+\s+(\/.+)$/);
    if (m) unique.add(m[1]);
  }
  const unsigned = [];
  const adhoc = [];
  for (const p of Array.from(unique).slice(0, 300)) {
    const r = await run('/usr/bin/codesign', ['-dv', '--verbose=2', p], { timeout: 4000 });
    const out = (r.stderr || '') + (r.stdout || '');
    if (/not signed at all/i.test(out)) unsigned.push(p);
    else if (/Signature=adhoc/i.test(out)) adhoc.push(p);
  }
  const level = unsigned.length > 0 ? 'HIGH' : adhoc.length > 0 ? 'MEDIUM' : 'OK';
  return {
    label: `Running processes — ${unique.size} unique, ${unsigned.length} unsigned, ${adhoc.length} ad-hoc`,
    level,
    detail: unsigned.length ? unsigned.slice(0, 5).join(', ') : null,
    findings: { unsigned, adhoc },
  };
}

async function sweepRemoteAccess() {
  const services = [
    'com.apple.screensharing',
    'com.apple.RemoteDesktop.agent',
    'com.openssh.sshd',
    'com.apple.eppc',
  ];
  const active = [];
  for (const svc of services) {
    const a = await run('/bin/launchctl', ['print', `system/${svc}`], { timeout: 3500 });
    if (a.code === 0) active.push({ service: svc, scope: 'system' });
  }
  // Also check for VNC-style processes by name
  const ps = await run('/bin/ps', ['axo', 'pid,comm'], { timeout: 4000 });
  const vncLines = (ps.stdout || '').split('\n').filter(l => /(vnc|screensharing|ARDAgent|RemoteDesktop)/i.test(l));
  const level = active.length > 0 || vncLines.length > 0 ? 'CRITICAL' : 'OK';
  return {
    label: `Remote access services — ${active.length} launchd, ${vncLines.length} running process matches`,
    level,
    detail: level === 'CRITICAL' ? 'attacker control plane may be active' : null,
    findings: { launchd: active, processMatches: vncLines.slice(0, 10) },
  };
}

async function sweepLiveSessions() {
  const who = await run('/usr/bin/who', [], { timeout: 3500 });
  const w = await run('/usr/bin/w', [], { timeout: 3500 });
  const whoLines = (who.stdout || '').split('\n').filter(Boolean);
  const remoteSessions = whoLines.filter(l => /\(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\)/.test(l) || /\(.*\..*\)/.test(l));
  const level = remoteSessions.length > 0 ? 'CRITICAL' : 'OK';
  return {
    label: `Live sessions — ${whoLines.length} total, ${remoteSessions.length} remote`,
    level,
    detail: level === 'CRITICAL' ? 'someone is logged in right now from off-machine' : null,
    findings: { who: whoLines, w: (w.stdout || '').split('\n').slice(0, 30), remoteSessions },
  };
}

async function sweepConfigurationProfiles() {
  const [a, b] = await Promise.all([
    run('/usr/bin/profiles', ['show', '-type', 'configuration'], { timeout: 8000 }),
    run('/usr/bin/profiles', ['show', '-type', 'configuration', '-all'], { timeout: 8000 }),
  ]);
  const txt = (a.stdout || '') + (b.stdout || '');
  const none = /There are no configuration profiles/i.test(txt);
  if (none) return { label: 'Configuration profiles — none installed', level: 'OK', detail: null, findings: { profiles: [] } };
  // Any profile at all before baseline is established is highly suspicious.
  return {
    label: 'Configuration profiles — INSTALLED',
    level: 'CRITICAL',
    detail: 'Any profile present before SHIELD baseline = foothold unless you personally installed it.',
    findings: { userOutput: a.stdout, systemOutput: b.stdout },
  };
}

async function sweepLaunchAgents() {
  const paths = [
    { p: path.join(os.homedir(), 'Library/LaunchAgents'), critical: true },
    { p: '/Library/LaunchAgents',                          critical: true },
    { p: '/Library/LaunchDaemons',                         critical: true },
  ];
  const inventory = [];
  let total = 0;
  for (const { p } of paths) {
    try {
      if (!fs.existsSync(p)) continue;
      const files = fs.readdirSync(p).filter(f => f.endsWith('.plist'));
      total += files.length;
      inventory.push({ dir: p, files });
    } catch {}
  }
  // No clean way to say "these are all suspect" — the operator must review each.
  const level = total > 0 ? 'MEDIUM' : 'OK';
  return {
    label: `LaunchAgents/Daemons — ${total} user-installed plists inventoried`,
    level,
    detail: total > 0 ? 'Review every file — anything you did not install is a persistence mechanism.' : null,
    findings: { inventory },
  };
}

async function sweepCron() {
  const user = await run('/usr/bin/crontab', ['-l'], { timeout: 3500 });
  const root = await run('/usr/bin/sudo', ['-n', '/usr/bin/crontab', '-l'], { timeout: 3500 }); // non-interactive; will fail if no sudoers nopass
  const userJobs = user.code === 0 ? (user.stdout || '').split('\n').filter(l => l.trim() && !l.startsWith('#')) : [];
  const rootJobs = root.code === 0 ? (root.stdout || '').split('\n').filter(l => l.trim() && !l.startsWith('#')) : [];
  const total = userJobs.length + rootJobs.length;
  const level = total > 0 ? 'MEDIUM' : 'OK';
  return {
    label: `Cron jobs — ${userJobs.length} user, ${rootJobs.length} root`,
    level,
    detail: total > 0 ? 'Review each job — cron is a persistence path too.' : null,
    findings: { userJobs, rootJobs },
  };
}

async function sweepBrowserExtensions() {
  const safari = path.join(os.homedir(), 'Library/Safari/Extensions');
  const chrome = path.join(os.homedir(), 'Library/Application Support/Google/Chrome/Default/Extensions');
  const out = { safari: [], chrome: [] };
  try { if (fs.existsSync(safari)) out.safari = fs.readdirSync(safari); } catch {}
  try { if (fs.existsSync(chrome)) out.chrome = fs.readdirSync(chrome); } catch {}
  const total = out.safari.length + out.chrome.length;
  const level = total > 0 ? 'LOW' : 'OK';
  return {
    label: `Browser extensions — ${out.safari.length} Safari, ${out.chrome.length} Chrome`,
    level,
    detail: total > 0 ? 'Review each — malicious extensions are a top compromise vector.' : null,
    findings: out,
  };
}

async function sweepKexts() {
  const res = await run('/usr/sbin/kextstat', [], { timeout: 6000 });
  if (res.code !== 0) return { label: 'Kernel extensions', level: 'INFO', detail: 'kextstat unavailable', findings: [] };
  const lines = (res.stdout || '').split('\n').slice(1).filter(Boolean);
  const nonApple = lines.filter(l => !/com\.apple\./i.test(l));
  const level = nonApple.length > 0 ? 'HIGH' : 'OK';
  return {
    label: `Kernel extensions — ${lines.length} total, ${nonApple.length} non-Apple`,
    level,
    detail: nonApple.length > 0 ? 'Non-Apple kext = kernel-level code running. Review each.' : null,
    findings: { nonApple: nonApple.slice(0, 20) },
  };
}

async function sweepHosts() {
  try {
    const content = fs.readFileSync('/etc/hosts', 'utf8');
    // Default /etc/hosts on macOS contains only localhost/broadcasthost lines.
    const nonDefault = content.split('\n').filter(l => {
      const t = l.trim();
      if (!t || t.startsWith('#')) return false;
      if (/^127\.0\.0\.1\s+localhost\b/.test(t)) return false;
      if (/^255\.255\.255\.255\s+broadcasthost\b/.test(t)) return false;
      if (/^::1\s+localhost\b/.test(t)) return false;
      if (/^fe80::1%lo0\s+localhost\b/.test(t)) return false;
      return true;
    });
    const level = nonDefault.length > 0 ? 'HIGH' : 'OK';
    return {
      label: `/etc/hosts — ${nonDefault.length} non-default entries`,
      level,
      detail: nonDefault.length > 0 ? 'Non-default /etc/hosts entry = possible DNS poisoning.' : null,
      findings: { nonDefault, full: content.length < 8192 ? content : null },
    };
  } catch (err) {
    return { label: '/etc/hosts', level: 'INFO', detail: err.message, findings: [] };
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Orchestrator
// ──────────────────────────────────────────────────────────────────────────

async function runSweep() {
  header('SHIELD — Initial Forensic Sweep');
  process.stdout.write(C.gray('Assumes the Mac is already compromised. Checking every attacker-relevant surface.\n'));
  process.stdout.write(C.gray('No baseline has been established yet. Anything suspicious is flagged on its own merits.\n'));

  header('Network sockets and sessions');
  const sockets    = await sweepSockets();           print(sockets.label,    sockets.level,    sockets.detail);
  const remote     = await sweepRemoteAccess();      print(remote.label,     remote.level,     remote.detail);
  const sessions   = await sweepLiveSessions();      print(sessions.label,   sessions.level,   sessions.detail);

  header('Running code');
  const processes  = await sweepProcessCodesign();   print(processes.label,  processes.level,  processes.detail);
  const kexts      = await sweepKexts();             print(kexts.label,      kexts.level,      kexts.detail);

  header('Persistence mechanisms');
  const profiles   = await sweepConfigurationProfiles(); print(profiles.label,   profiles.level,   profiles.detail);
  const launch     = await sweepLaunchAgents();      print(launch.label,     launch.level,     launch.detail);
  const cron       = await sweepCron();              print(cron.label,       cron.level,       cron.detail);
  const hosts      = await sweepHosts();             print(hosts.label,      hosts.level,      hosts.detail);
  const extensions = await sweepBrowserExtensions(); print(extensions.label, extensions.level, extensions.detail);

  const all = [sockets, processes, remote, sessions, profiles, launch, cron, extensions, kexts, hosts];
  const criticals = all.filter(r => r.level === 'CRITICAL').length;
  const highs     = all.filter(r => r.level === 'HIGH').length;

  header('Summary');
  if (criticals > 0) {
    process.stdout.write(C.red(`  ${criticals} CRITICAL finding(s). Do not proceed with setup. Go to docs/INCIDENT_RESPONSE.md.\n`));
  } else if (highs > 0) {
    process.stdout.write(C.yellow(`  ${highs} HIGH finding(s). Review each before proceeding with setup.\n`));
  } else {
    process.stdout.write(C.green('  No CRITICAL or HIGH findings. Surface looks clean at time of sweep. Proceed to --setup.\n'));
  }
  process.stdout.write(C.gray('\nFull findings are stored in the object returned by this function.\n'));

  return {
    generatedAt: new Date().toISOString(),
    hostname: os.hostname(),
    user: os.userInfo().username,
    criticals,
    highs,
    checks: { sockets, processes, remote, sessions, profiles, launch, cron, extensions, kexts, hosts },
  };
}

module.exports = { runSweep };
