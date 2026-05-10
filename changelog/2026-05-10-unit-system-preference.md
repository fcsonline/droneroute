## Summary

Add a unit system preference (metric or imperial) to the account settings, allowing users to view all distances, speeds, and heights in their preferred units.

## Changes

- Added "Unit system" dropdown in the Visualization tab of the settings dialog (metric / imperial)
- All distances now display in km/m or mi/ft depending on the setting
- All speeds now display in m/s or mph depending on the setting
- All heights now display in m or ft depending on the setting
- Form inputs (flight speed, takeoff height, transit speed, waypoint altitude/speed, template parameters) convert bidirectionally between display and internal metric values
- Shared mission pages default to metric for unauthenticated users
- Internal storage remains metric (m, m/s) — conversion is display-only
