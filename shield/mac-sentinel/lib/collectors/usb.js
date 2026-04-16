// USB device collector.
//
// Enumerates every USB device via system_profiler SPUSBDataType.
// A new unknown USB device is a physical-access warning (juice-jacking,
// hostile cable, BadUSB, HID injection). Flagged as MEDIUM on first
// appearance; whitelist via the PWA.

'use strict';

const { run } = require('../shell');

// Apple USB vendor ID is 0x05ac. iPhone family uses product IDs
// 0x1290..0x12ab and 0x12a0..0x12ff historically. A cleaner heuristic:
// vendor 0x05ac AND name contains "iPhone". Keep both for robustness.
function isIphone(dev) {
  const vendor = (dev.vendorId || '').toLowerCase();
  const name = (dev.name || '').toLowerCase();
  const mfr = (dev.manufacturer || '').toLowerCase();
  const appleVendor = vendor.includes('0x05ac') || mfr.includes('apple');
  const isIphoneName = name.includes('iphone');
  return appleVendor && isIphoneName;
}

function walkUsb(tree, out, depth = 0) {
  if (!tree) return;
  if (Array.isArray(tree)) {
    for (const item of tree) walkUsb(item, out, depth);
    return;
  }
  if (typeof tree !== 'object') return;
  if (tree._name) {
    const dev = {
      name: tree._name,
      manufacturer: tree.manufacturer || null,
      vendorId: tree.vendor_id || null,
      productId: tree.product_id || null,
      serial: tree.serial_num || null,
      location: tree.location_id || null,
      speed: tree.device_speed || null,
      bcdDevice: tree.bcd_device || null,
      fingerprint: [tree.vendor_id, tree.product_id, tree.serial_num, tree.location_id].filter(Boolean).join('/'),
    };
    dev.isIphone = isIphone(dev);
    out.push(dev);
  }
  if (tree._items) walkUsb(tree._items, out, depth + 1);
}

async function collect() {
  const res = await run('/usr/sbin/system_profiler', ['SPUSBDataType', '-json'], { timeout: 10000 });
  if (res.code !== 0 || !res.stdout) {
    return { available: false, devices: [], error: res.error || 'system_profiler failed' };
  }
  let parsed;
  try { parsed = JSON.parse(res.stdout); } catch (err) {
    return { available: false, devices: [], error: 'parse failed: ' + err.message };
  }
  const root = parsed?.SPUSBDataType || [];
  const devices = [];
  walkUsb(root, devices);
  const iphones = devices.filter(d => d.isIphone);
  return {
    available: true,
    devices,
    iphones,
    iphoneCount: iphones.length,
    count: devices.length,
    collectedAt: new Date().toISOString(),
  };
}

module.exports = { collect, isIphone };
