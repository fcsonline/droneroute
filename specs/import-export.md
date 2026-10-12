# Import and export

Bring in existing missions or export your planned flight as a file ready for DJI drones.

## What you can do

- **Export** a mission as a KMZ file compatible with DJI drones (WPML format).
- **Import** an existing KMZ file to load its waypoints, actions, POIs, and settings into the editor.

## How it works

### Exporting

1. Plan your mission in the editor.
2. Click the export/download button.
3. A KMZ file is generated and downloaded to your computer.
4. Load the KMZ onto your drone's controller (manually or using the upload tool).

### Importing

1. Click the import button.
2. Select a KMZ file from your computer.
3. The app reads the file and loads all waypoints, actions, and settings into the editor.

## Good to know

- Exports depend on the selected drone profile. DJI Fly and DJI Pilot use different KMZ dialects; selecting the correct model matters.
- Imported missions may not look exactly the same if the original file used features not supported by DroneRoute.
- The maximum import file size is 50 MB.
- Imported and saved missions are validated: files with malformed contents or
  out-of-range coordinates are rejected with an error rather than being loaded.

## DJI Air 3S

- Choose **DJI Air 3S** to export the dedicated DJI Fly layout. Existing profiles,
  including M30 Dock, retain their original export format. Old saved missions
  are not automatically reassigned to Air 3S.
- The profile always uses heights relative to the takeoff point, shown as 0 m.
  Selecting Air 3S changes the reference while keeping waypoint height numbers
  unchanged. Configure takeoff clearance separately in DJI Fly.
- Facade scans export explicit wall-facing headings and gimbal pitch actions
  before photographs. POI headings are converted to per-waypoint angles.
- Photo, video, hover, aircraft heading, and gimbal pitch actions are supported.
  Focus, zoom, gimbal yaw/roll, and coordinated turns are rejected with an
  explanation. This profile limits missions to 2–200 points and speeds up to
  15 m/s, and validates pitch within −90° to 60°.
- Import reads executable wayline overrides, so older M3E wall missions retain
  their fixed heading, turn settings, and camera parameters. Decimal and zero
  heights are preserved. Air 3S actions spanning two points keep their boundaries.
- Inspect the exported mission in DJI Fly. Software checks and the editor preview
  do not confirm aircraft behavior or simulate DJI flight dynamics. The profile
  is based on a known working reference; its generated output awaits flight validation.
