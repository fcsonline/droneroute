# Import and export

Bring in existing missions or export your planned flight as a file ready for DJI drones.

## What you can do

- **Export** a mission as a KMZ file compatible with DJI Fly-style waypoint missions.
- **Import** an existing DJI WPML or DJI Fly/Lito-style KMZ file to load its waypoints, actions, POIs, and settings into the editor.

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

- Exported files use the DJI Fly/Lito-style `wpmz/template.kml` and `wpmz/waylines.wpml` layout.
- Imported DJI Fly/Lito action groups are preserved for export when DroneRoute does not display every action detail in the editor.
- Imported missions may not look exactly the same if the original file used features not supported by DroneRoute.
- Imports must be KMZ files, and the maximum import file size is 50 MB.
