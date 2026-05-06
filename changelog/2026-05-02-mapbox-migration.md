## Summary

Migrate from Leaflet to Mapbox GL JS with full 3D support — terrain, buildings, and flight path visualization.

## Changes

- Replace Leaflet and react-leaflet with Mapbox GL JS and react-map-gl
- Add 3D terrain (Mapbox DEM) with exaggeration
- Add extruded 3D buildings with click-to-convert-to-obstacle
- 3D flight path lines elevated to waypoint altitude via line-z-offset
- Vertical dashed poles from ground to each waypoint
- Custom Marker3D component with terrain-aware altitude positioning
- Street/satellite style switcher
- Map starts at 45 degree pitch for 3D viewing
- SharedMissionPage rewritten with interactive Mapbox map
- MAPBOX_TOKEN environment variable required for all instances
- Camera frustum visualization — a cone projected from the selected waypoint showing the camera's field of view aimed at the POI
- Fix 3D buildings layer not re-appearing after style switches (street ↔ satellite)
- Geocoding search box for location lookup (Mapbox Search API)
- Fix KMZ import parsing for missions exported from DJI Pilot
