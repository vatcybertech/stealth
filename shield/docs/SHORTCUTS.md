# SHIELD iOS Shortcuts Setup

The SHIELD PWA on iPhone cannot toggle Wi-Fi, Bluetooth, or Airplane Mode directly — iOS does not expose those controls to the web platform. iOS Shortcuts can. These Shortcuts are the bridge: SHIELD opens `shortcuts://run-shortcut?name=…` and iOS routes it to the Shortcut of the same name. First run asks you to confirm; after that, iOS remembers.

You will create five Shortcuts. Do them once, on your iPhone, in the Shortcuts app.

*(v1.3 added `SHIELD Hourly Check` for passive mobile observation while you are off-network. See [`MOBILE_USE.md`](MOBILE_USE.md) for the full mobile workflow.)*

---

## Before you start

1. Open the **Shortcuts** app.
2. Tap **Shortcuts** tab at the bottom (not Automation).
3. We will create five shortcuts: **SHIELD Kill Switch**, **SHIELD Night Mode**, **SHIELD Morning Check**, **SHIELD Log Snapshot**, and **SHIELD Hourly Check**.
4. The names MUST match exactly. SHIELD looks them up by name.

After creating them, you will also set two Automations (Night Mode at bedtime, Morning Check after wake). Those are optional but recommended.

---

## Shortcut 1 — SHIELD Kill Switch

**Purpose:** One-tap "something is wrong, shut it all down." Turns off Wi-Fi and Bluetooth, enables Airplane Mode, opens SHIELD, and Do Not Disturbs.

**Steps:**

1. Tap **+** in the upper right to create a new Shortcut.
2. Tap **Add Action**.
3. Search for **Set Airplane Mode**. Add it. Tap the blue "Turn" toggle so it reads **Turn Airplane Mode On**.
4. Tap **+** or **Add Action** again. Search **Set Wi-Fi**. Add it. Set to **Turn Wi-Fi Off**.
5. Add **Set Bluetooth**. Set to **Turn Bluetooth Off**.
6. Add **Set Focus**. Choose **Do Not Disturb**. Set to **Turn On**. Duration: **Until Turned Off**.
7. Add **Open URL**. In the URL field, enter your SHIELD PWA URL (see Deploy docs) — or if installed to home screen, you can add **Open App → SHIELD**.
8. Add **Show Notification**. Title: `SHIELD Kill Switch Active`. Body: `Radios off. Airplane Mode on. DND on.`
9. Tap the Shortcut name at the top (defaults to something generic) and **rename to exactly:** `SHIELD Kill Switch` (case-sensitive, one space).
10. Tap **Done**.
11. Run it once from the Shortcut tile to authorize. iOS will ask permission for each action the first time.

**Home Screen access:**
- In the Shortcut editor, tap the share icon → **Add to Home Screen** — gives you a one-tap launcher.
- Or **Settings → Accessibility → Touch → Back Tap → Double Tap → Run Shortcut → SHIELD Kill Switch** for a true panic button.

**Important:** Airplane Mode ON on iPhone also blocks LTE. That is the point — you are severing every radio. Turn it off when the situation has de-escalated.

---

## Shortcut 2 — SHIELD Night Mode

**Purpose:** Nightly baseline. Reduces attack surface while you sleep.

**Steps:**

1. Create a new Shortcut. Rename to `SHIELD Night Mode`.
2. Add **Set Bluetooth** → Off.
3. Add **Set Focus** → **Sleep** (or Do Not Disturb). Turn On. Until Turned Off.
4. Add **Set Appearance** → Dark. (Cosmetic, but reduces screen glow if it comes on.)
5. Add **Adjust Brightness** → Decrease by 100% (as low as possible).
6. Add **Open URL** → your SHIELD PWA URL.
7. Done.

---

## Shortcut 3 — SHIELD Morning Check

**Purpose:** First thing in the morning, undo Night Mode and open SHIELD to review overnight alerts.

**Steps:**

1. Create a new Shortcut. Rename to `SHIELD Morning Check`.
2. Add **Set Airplane Mode** → Off.
3. Add **Set Wi-Fi** → On.
4. Add **Set Focus** → Do Not Disturb → Turn Off.
5. Add **Get Current Network** → Wi-Fi.
6. Add **If**. Condition: **Network Name** → **is not** → `[your home SSID]`. In the If branch, add **Show Alert** with title `WARNING` and message `Not on your home Wi-Fi — investigate.` End If.
7. Add **Open URL** → your SHIELD PWA URL.
8. Done.

---

## Shortcut 4 — SHIELD Log Snapshot

**Purpose:** Read the things a PWA cannot read (SSID, battery state, orientation, etc.) and append them to a local Note so you can paste them into the SHIELD journal later.

**Steps:**

1. Create a new Shortcut. Rename to `SHIELD Log Snapshot`.
2. Add **Current Date** → Output: short format.
3. Add **Get Current Network** → Wi-Fi. Output goes to a variable called **SSID**.
4. Add **Get Battery Level**. Output to variable **Battery**.
5. Add **Get Device Details** → **Device Model**. Output to variable **Model**.
6. Add **Text** → `SHIELD snapshot at [Date]\nModel: [Model]\nSSID: [SSID]\nBattery: [Battery]%\n\nObservations:\n`
7. Add **Append to Note**. Select or create a Note called `SHIELD Log` in the Notes app.
8. Done.

Use this before or after using the SHIELD PWA journal so the iOS-only data (like SSID) ends up in your record.

---

---

## Shortcut 5 — SHIELD Hourly Check (v1.3, mobile observer)

**Purpose:** passive, hourly iPhone state snapshot for when you are off the Mac's network. iOS will not run a PWA in the background, but it WILL run a Shortcut on a time automation. This is how SHIELD gets any passive iPhone observation at all while you are mobile.

**Steps:**

1. Create a new Shortcut. Rename to exactly `SHIELD Hourly Check`.
2. Add **Current Date** → output variable `Now`.
3. Add **Get Battery Level** → output variable `Battery`.
4. Add **Get Network Details → Network Name (SSID)** → output `SSID`.
5. Add **Get Network Details → BSSID** if your iOS version exposes it → output `BSSID`.
6. Add **Get Current Focus** (iOS 16+) → output `Focus`.
7. Add **Get Device Details → Device Model** → output `Model`.
8. Add a **Text** action with body:
   ```
   SHIELD hourly check
   time:    [Now]
   model:   [Model]
   ssid:    [SSID]
   bssid:   [BSSID]
   battery: [Battery]%
   focus:   [Focus]
   ```
9. Add **Append to Note** → pick or create a note called `SHIELD Log` that lives **On My iPhone** (local only, not in iCloud).
10. Tap **Done**.

**Automation setup:**

1. Shortcuts app → **Automation** tab → **+** → **Create Personal Automation** → **Time of Day**.
2. Set a 5-minute-past-the-hour offset (e.g., 10:05 AM), **Repeat: Hourly**.
3. **Ask Before Running: OFF.** **Notify When Run: OFF.** (Optional during setup — turn these off after verifying it works.)
4. Action → **Run Shortcut** → **SHIELD Hourly Check** → Done.

Now every hour, while you are mobile, the iPhone appends a passive snapshot to `SHIELD Log`. Review it on a weekly basis; import anomalies into the SHIELD PWA journal as needed. Full mobile workflow in [`MOBILE_USE.md`](MOBILE_USE.md).

---

## Automations (optional but recommended)

In the Shortcuts app, tap **Automation** at the bottom.

### Bedtime automation
1. Tap **+** → **Create Personal Automation** → **Time of Day**.
2. Pick your bedtime (e.g., 11:00 PM). Uncheck "Ask Before Running."
3. Action → **Run Shortcut** → **SHIELD Night Mode**.
4. Done.

### Wake automation
1. Tap **+** → **Create Personal Automation** → **Time of Day** or **Alarm**.
2. Pick your wake time.
3. Run **SHIELD Morning Check**. Ask Before Running: your choice.

### Arrive home / leave home (optional)
If you want SHIELD to run `Morning Check` every time you arrive home and `Night Mode` every time you leave:

1. **+** → **Personal Automation** → **Arrive** → choose Home.
2. Action → Run Shortcut → `SHIELD Morning Check`.
3. Done.

Repeat with **Leave** → `SHIELD Night Mode`.

---

## Testing

After creating all four:

1. Open the SHIELD PWA.
2. Go to **Settings → Kill switch**.
3. Tap **Run Kill Switch** — it should prompt iOS to run your Shortcut.
4. Tap **Night Mode** — should run.
5. Tap **Morning Check** — should run.

If any button does nothing, it means the Shortcut name does not match exactly what the PWA is looking for. The names are literal and case-sensitive:

- `SHIELD Kill Switch`
- `SHIELD Night Mode`
- `SHIELD Morning Check`
- `SHIELD Log Snapshot`

---

## On macOS (MacBook)

You can recreate the same four Shortcuts on macOS in the Shortcuts app. macOS supports:

- **Set Wi-Fi** (built-in action)
- **Set Bluetooth** (built-in)
- **Set Do Not Disturb / Focus** (built-in)
- **Open URL** (built-in)

macOS does not have an exact equivalent of Airplane Mode (there's no cellular radio), so the Kill Switch on Mac is: Wi-Fi off + Bluetooth off + DND on + lock screen.

Shortcut names are the same — the PWA opens `shortcuts://run-shortcut?name=…` on both platforms. macOS Safari will hand the URL off to the Shortcuts app on Mac.
