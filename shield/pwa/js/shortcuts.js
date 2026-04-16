// SHIELD PWA — iOS Shortcuts bridge.
//
// On iOS, a PWA cannot toggle Wi-Fi, Bluetooth, or Airplane Mode. But an
// iOS Shortcut CAN. We bridge by opening x-callback URLs the system
// routes to the Shortcuts app. First run requires the user to confirm
// the Shortcut; after that, Shortcuts remembers and runs silently.

'use strict';

(function (window) {
  function runShortcut(name) {
    const url = 'shortcuts://run-shortcut?name=' + encodeURIComponent(name);
    window.location.href = url;
  }

  function runShortcutWithInput(name, input) {
    const url = 'shortcuts://run-shortcut?name=' + encodeURIComponent(name) + '&input=text&text=' + encodeURIComponent(input);
    window.location.href = url;
  }

  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isMac = /Macintosh/.test(navigator.userAgent);

  function killSwitch() {
    if (!isIos && !isMac) {
      alert('Kill Switch requires iOS or macOS Shortcuts.');
      return false;
    }
    runShortcut('SHIELD Kill Switch');
    return true;
  }
  function nightMode() {
    runShortcut('SHIELD Night Mode');
  }
  function morningCheck() {
    runShortcut('SHIELD Morning Check');
  }
  function logSnapshot() {
    runShortcut('SHIELD Log Snapshot');
  }

  window.ShieldShortcuts = {
    isIos, isMac,
    runShortcut, runShortcutWithInput,
    killSwitch, nightMode, morningCheck, logSnapshot,
  };
})(window);
