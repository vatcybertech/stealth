# SHIELD iOS Shortcuts

The PWA cannot toggle Wi-Fi, Bluetooth, or Airplane Mode on iOS. iOS Shortcuts can. These Shortcuts are the bridge.

**Full setup instructions:** [`../docs/SHORTCUTS.md`](../docs/SHORTCUTS.md).

## Required Shortcut names

Create these four Shortcuts in the iOS Shortcuts app with **exactly** these names (case-sensitive):

- `SHIELD Kill Switch`
- `SHIELD Night Mode`
- `SHIELD Morning Check`
- `SHIELD Log Snapshot`

The PWA invokes them via `shortcuts://run-shortcut?name=<name>`. If the names don't match exactly, the PWA buttons will do nothing.

## Why not ship pre-built `.shortcut` files?

Shortcuts that target sensitive system actions (Airplane Mode, Wi-Fi, Bluetooth) cannot always be imported as-is across iOS versions — Apple changes the action catalog over minor releases. Hand-building the Shortcut against your own device's action catalog is the most reliable path and takes under 5 minutes per shortcut.

## Testing

Open SHIELD PWA → **Settings** → **Kill switch** section:
- **Run Kill Switch** — dry run
- **Night Mode** — dry run
- **Morning Check** — dry run

Each button opens the corresponding Shortcut. If a button opens Shortcuts but shows "Shortcut not found," the name does not match exactly.
