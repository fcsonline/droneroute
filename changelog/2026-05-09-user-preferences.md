## Summary

Add user preferences with two new tabs in the settings dialog: **Visualization** (view mode, map style) and **Mission defaults** (drone, speed, heights, safety options). Preferences are stored server-side and sync across devices.

## Changes

- Added "Visualization" and "Mission defaults" tabs to the settings dialog alongside the existing "Account" tab.
- Visualization preferences (2D/3D view mode, satellite/street map style) are applied as defaults when the map loads.
- Mission default preferences (drone model, payload, speeds, heights, heading mode, finish action, RC lost action, etc.) are applied when creating a new mission.
- Added backend API (`GET /preferences`, `PUT /preferences`) and `user_preferences` database table.
- Added frontend preferences store (Zustand) that fetches preferences on login.
