# droneroute

Upload DJI waypoint mission KMZ files to RC controllers via USB.

```bash
npx droneroute mission.kmz
```

## What it does

1. Detects DJI RC controllers connected via USB or mounted SD cards
2. If multiple controllers are found, lets you choose one
3. Creates a new mission slot on the controller
4. Places the KMZ file so DJI Fly recognizes it immediately

No need to manually create placeholder missions, browse the filesystem, or rename files with UUIDs.

## Prerequisites

- **Node.js 18+** — required to run `npx`
- **adb (Android Debug Bridge)** — needed for USB-connected controllers:
  - macOS: `brew install android-platform-tools`
  - Linux: `apt install adb`
  - Windows: included with [Android SDK platform-tools](https://developer.android.com/tools/releases/platform-tools)
- For SD cards: just insert the card into your computer, no extra tools needed

## Supported controllers

Any DJI controller running DJI Fly with waypoint support:

- DJI RC
- DJI RC 2
- DJI RC Pro / RC Pro 2
- DJI RC-N1 / RC-N2

## Creating KMZ missions

You can create DJI WPML-compliant KMZ files with:

- **[DroneRoute](https://droneroute.io)** — free, open-source web-based mission planner
- DJI Pilot 2
- DJI FlightHub 2
- Any tool that generates DJI WPML KMZ files

## How it works

DJI Fly stores waypoint missions on the controller at:

```
Android/data/dji.go.v5/files/waypoint/<uuid>/<uuid>.KMZ
```

Each mission lives in a folder named with a UUID, containing a single KMZ file with the same UUID as its filename. This tool generates a new UUID, creates the folder, and places your KMZ file with the matching name. DJI Fly picks it up as a new mission entry.

## Examples

Upload a mission to the only connected controller:

```bash
npx droneroute my-survey.kmz
```

If multiple controllers are connected, an interactive prompt appears:

```
$ npx droneroute my-survey.kmz

Searching for DJI controllers...

Multiple DJI controllers found. Select one:
❯ DJI RC 2 (adb: 3A2F4B1C)
  SD card (/Volumes/DJI_RC)

Uploading my-survey.kmz...
✓ Mission uploaded successfully
  Mission ID: 550E8400-E29B-41D4-A716-446655440000

Open DJI Fly on the controller and look for the new
mission in the waypoint list.
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No DJI controllers found" | Connect the controller via USB and power it on. Ensure the cable supports data transfer (not charge-only). |
| adb not found | Install Android platform-tools: `brew install android-platform-tools` (macOS) or `apt install adb` (Linux). |
| Permission denied on waypoint path | Enable USB debugging on the controller: Settings > Developer Options > USB Debugging. |
| Controller not detected by adb | Try a different USB cable or port. Enable "File Transfer" mode when the USB dialog appears on the controller. |
| Mission doesn't appear in DJI Fly | Open the waypoint mission list and scroll — new missions appear at the end. Tap on it to load it into the editor. |
| SD card method: directory not found | The waypoint directory is only created after you save at least one waypoint mission via DJI Fly on the controller. |

## License

MIT
