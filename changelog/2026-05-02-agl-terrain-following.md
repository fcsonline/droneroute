## Summary

Add terrain-aware "above ground level" (AGL) altitude mode with elevation data from the Open Elevation API.

## Changes

- Add backend elevation proxy endpoint (`POST /api/elevation`) that fetches terrain elevation from the Open Elevation API
- Add frontend elevation store with caching and debounced fetching
- Update the elevation chart to show a terrain profile (filled polygon) when in AGL mode, with vertical dashed lines from terrain to each waypoint
- Convert AGL heights to ATL (relative to start point) on KMZ export so the mission works on any DJI drone without requiring terrain data on the controller
