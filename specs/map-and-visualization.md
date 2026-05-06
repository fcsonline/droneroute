# Map and visualization

An interactive map where you plan flights and see everything at a glance.

## What you can do

- Pan, zoom, and interact with a Mapbox GL JS satellite map.
- Switch between **satellite** and **street** (dark) map styles using the bottom-left buttons.
- Toggle between **2D** and **3D** view modes.
- Search for any location using the **geocoding search box** (top-left magnifying glass icon). Type a place name, address, or landmark and the map flies there.
- See the flight path as a dashed line connecting all waypoints.
- See colored lines from waypoints to POIs showing camera aim (green = correct pitch, red = needs adjustment).
- See obstacle polygons drawn on the map.
- Click extruded 3D buildings to **convert them to obstacles** via a popup.
- Use the floating toolbar to switch between waypoint mode, POI mode, and template tools.
- View an elevation graph below the waypoint list that shows altitude changes across the flight.
- See live previews when configuring templates before placing them.

## 3D mode

When you switch to 3D:

- **Terrain** — real-world elevation data from Mapbox DEM renders mountains and valleys.
- **Extruded buildings** — 3D buildings appear at zoom level 14+, with height and footprint from OpenStreetMap data.
- **Elevated flight path** — the flight path line floats at each waypoint's configured altitude, interpolating between segments.
- **Elevated markers** — waypoint and POI markers are positioned at their configured height above ground.
- **Drop lines** — subtle vertical lines connect each waypoint marker down to the ground.
- **Vertical poles** — dashed lines from ground to waypoint altitude.
- **Ground shadow** — a faint gray line on the ground traces the flight path from above.
- **POI pointing lines** — green lines from waypoints to POIs are elevated to match their respective heights.
- **Camera frustum** — when a waypoint is selected and has a POI target, a translucent slate-gray cone is drawn from the waypoint toward the POI, visualizing the camera's field of view and gimbal pitch.
- The camera tilts to 45° pitch and you can freely rotate and tilt the view.

## 2D mode (default)

- Flat top-down view with no terrain elevation.
- No drop lines, poles, or ground shadow.
- All markers are placed at ground level.
- Flight path and POI lines are flat.
- Camera rotation and pitch are locked.

## How it works

The map is the central workspace. Everything you do — placing waypoints, POIs, obstacles, or templates — happens directly on the map. The sidebar shows lists and settings, and the two stay in sync.

## Good to know

- The default view is **satellite** imagery in **2D** mode.
- You can click waypoints and POIs directly on the map to select and edit them.
- The geocoding search box collapses to an icon when not in use to save space.
- A Mapbox access token is required. Self-hosted instances must set `MAPBOX_TOKEN` in their `.env` file.
