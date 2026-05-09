## Summary

Add airspace restriction zones overlay with ENAIRE provider for Spain, allowing pilots to see prohibited and restricted airspace zones directly on the map.

## Changes

- Add backend airspace service with ENAIRE ArcGIS provider that fetches drone restriction/prohibition zones
- Add `/api/airspace/zones` endpoint returning zones for a given bounding box
- Add frontend map overlay rendering zones as colored polygons (red for prohibited, orange for restricted) using Mapbox GL JS
- Add flight path intersection warnings — red banner for prohibited zones, orange for restricted
- Add airspace toggle in the Visualization tab under "Extra layers"
- Add `A` keyboard shortcut to toggle airspace overlay on/off
