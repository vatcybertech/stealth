// SHIELD Mac Sentinel — rules engine.
//
// User-configurable rules that adjust the severity of incoming events or
// inject additional events. Evaluated after analyze(), before ledger write.
//
// Rule shape:
//   {
//     id: string,
//     when: { type?: string, severity?: string, payloadContains?: string },
//     do: { setSeverity?: string, addTag?: string, drop?: bool },
//     timeWindow?: { startHour: 0-23, endHour: 0-23 }
//   }

'use strict';

function inTimeWindow(now, w) {
  if (!w) return true;
  const h = now.getHours();
  if (w.startHour <= w.endHour) {
    return h >= w.startHour && h < w.endHour;
  }
  // Wraparound (e.g. 23-6)
  return h >= w.startHour || h < w.endHour;
}

function matches(event, when) {
  if (!when) return true;
  if (when.type && event.type !== when.type) return false;
  if (when.severity && event.severity !== when.severity) return false;
  if (when.payloadContains) {
    const s = JSON.stringify(event.payload || {});
    if (!s.toLowerCase().includes(when.payloadContains.toLowerCase())) return false;
  }
  return true;
}

function applyRules(events, rules, now = new Date()) {
  if (!Array.isArray(rules) || rules.length === 0) return events;
  const out = [];
  for (const event of events) {
    let current = { ...event };
    let dropped = false;
    for (const rule of rules) {
      if (!inTimeWindow(now, rule.timeWindow)) continue;
      if (!matches(current, rule.when)) continue;
      const action = rule.do || {};
      if (action.drop) { dropped = true; break; }
      if (action.setSeverity) current.severity = action.setSeverity;
      if (action.addTag) {
        current.payload = { ...current.payload, _tags: [...(current.payload?._tags || []), action.addTag] };
      }
    }
    if (!dropped) out.push(current);
  }
  return out;
}

// Default rules shipped with SHIELD — conservative, opt-out.
const DEFAULTS = [
  {
    id: 'nighttime-escalate',
    when: { severity: 'LOW' },
    do: { setSeverity: 'MEDIUM', addTag: 'night' },
    timeWindow: { startHour: 23, endHour: 6 },
  },
  {
    id: 'profile-present-always-critical',
    when: { type: 'PROFILE_PRESENT' },
    do: { setSeverity: 'CRITICAL', addTag: 'profile' },
  },
  {
    id: 'launchagent-new-always-critical',
    when: { type: 'LAUNCHAGENT_NEW' },
    do: { setSeverity: 'CRITICAL', addTag: 'persistence' },
  },
  {
    id: 'remote-login-enabled-critical',
    when: { type: 'SHARING_ENABLED', payloadContains: 'Remote Login' },
    do: { setSeverity: 'CRITICAL', addTag: 'remote-access' },
  },
  {
    id: 'screen-sharing-enabled-critical',
    when: { type: 'SHARING_ENABLED', payloadContains: 'Screen Sharing' },
    do: { setSeverity: 'CRITICAL', addTag: 'remote-access' },
  },
];

module.exports = { applyRules, DEFAULTS };
