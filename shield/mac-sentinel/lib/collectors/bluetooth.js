// Bluetooth collector — enumerate paired and recently-seen devices.
//
// Source: system_profiler SPBluetoothDataType -json
//
// Output shape:
//   {
//     enabled: bool,
//     address: "xx:xx:xx:xx:xx:xx",
//     discoverable: bool,
//     devices: [
//       { name, address, type, minor_type, vendor_id, product_id, rssi, connected, paired, services, firstSeenBySentinel }
//     ]
//   }

'use strict';

const { run } = require('../shell');

async function collect() {
  const res = await run('/usr/sbin/system_profiler', ['SPBluetoothDataType', '-json'], { timeout: 12000 });
  if (res.code !== 0 || !res.stdout) {
    return { available: false, error: res.error || 'system_profiler failed', devices: [] };
  }
  let parsed;
  try {
    parsed = JSON.parse(res.stdout);
  } catch (err) {
    return { available: false, error: 'parse failed: ' + err.message, devices: [] };
  }
  const block = parsed?.SPBluetoothDataType?.[0] || {};
  const controller = block.controller_properties || {};

  const devices = [];
  const pushDevice = (name, props, status) => {
    devices.push({
      name: name || 'Unknown',
      address: (props.device_address || '').toLowerCase(),
      type: props.device_minorType || props.device_majorType || null,
      vendorId: props.device_vendorID || null,
      productId: props.device_productID || null,
      firmwareVersion: props.device_firmwareVersion || null,
      rssi: props.device_rssi || null,
      connected: status === 'connected',
      paired: props.device_isPaired === 'attrib_Yes' || status === 'paired',
      services: props.device_services || null,
      manufacturer: props.device_manufacturer || null,
    });
  };

  const connected = block.device_connected || [];
  const notConnected = block.device_not_connected || [];
  for (const entry of connected) {
    for (const [name, props] of Object.entries(entry)) pushDevice(name, props, 'connected');
  }
  for (const entry of notConnected) {
    for (const [name, props] of Object.entries(entry)) pushDevice(name, props, 'paired');
  }

  return {
    available: true,
    enabled: controller.controller_state === 'attrib_on',
    address: (controller.controller_address || '').toLowerCase(),
    discoverable: controller.controller_discoverable === 'attrib_on',
    firmwareVersion: controller.controller_firmwareVersion || null,
    transport: controller.controller_transport || null,
    devices,
    deviceCount: devices.length,
    collectedAt: new Date().toISOString(),
  };
}

module.exports = { collect };
