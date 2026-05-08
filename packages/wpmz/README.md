# @droneroute/dji-wpmz-universal

A small, dependency-free Node.js TypeScript module for reading and writing DJI waypoint KMZ/WPMZ files.

It supports two profile families:

- **DJI WPML / Pilot 2 style**: `xmlns:wpml="http://www.dji.com/wpmz/1.0.2"`, usually with a full waypoint template in `template.kml`.
- **DJI Fly / Lito-style observed sample**: `xmlns:wpml="http://www.uav.com/wpmz/1.0.2"`, minimal `template.kml`, and most route detail in `waylines.wpml`.

The parser is namespace-tolerant: it matches by XML local name, then preserves unknown/extra XML elements so the writer can round-trip fields the normalized DroneRoute model does not yet understand.

## Use inside DroneRoute

The package is part of the DroneRoute workspace and is built before the backend. Backend import/export code can use it directly:

```ts
import {
  DJI_FLY_UAV_PROFILE,
  buildWpmzKmz,
  fromDroneRouteMission,
  readWpmzKmz,
} from "@droneroute/dji-wpmz-universal";

const doc = fromDroneRouteMission(mission, DJI_FLY_UAV_PROFILE);
const kmzBytes = buildWpmzKmz(doc);

const imported = readWpmzKmz(uploadedKmzBytes);
console.log(imported.profileId, imported.waylines[0]?.waypoints.length);
```

DroneRoute exports with `DJI_FLY_UAV_PROFILE` so generated missions use the DJI Fly/Lito-style `wpmz/template.kml` and `wpmz/waylines.wpml` layout.

## Why this exists

The current DroneRoute generator is close for DJI enterprise WPML, but the uploaded Lito/Fly sample differs in ways that require a profile-based writer:

- The WPML namespace is `http://www.uav.com/wpmz/1.0.2`, not `http://www.dji.com/wpmz/1.0.2`.
- `template.kml` contains metadata and `missionConfig`, but no waypoint `Folder`.
- `waylines.wpml` uses direct `executeHeightMode`, `distance`, `duration`, `autoFlightSpeed`, and all waypoint/action details.
- Waypoint actions need full action groups: `parallel`/`sequence`, trigger type, start index, end index, and multiple actions per group.
- Segment-trigger actions such as `gimbalEvenlyRotate` use `betweenAdjacentPoints`, so a flat per-waypoint action list is lossy.

## API

### `readWpmzKmz(input)`

Reads a `.kmz` buffer and returns a normalized `WpmzDocument`.

```ts
import { readFileSync } from "node:fs";
import { readWpmzKmz } from "@droneroute/dji-wpmz-universal";

const doc = readWpmzKmz(readFileSync("mission.kmz"));
```

### `buildWpmzKmz(document, options?)`

Builds a `.kmz` buffer with:

```text
wpmz/template.kml
wpmz/waylines.wpml
```

```ts
import {
  DJI_FLY_UAV_PROFILE,
  buildWpmzKmz,
} from "@droneroute/dji-wpmz-universal";

const bytes = buildWpmzKmz(doc, { profile: DJI_FLY_UAV_PROFILE });
```

### `buildWpmzFiles(document, options?)`

Builds the XML strings without zipping.

```ts
const { templateKml, waylinesWpml } = buildWpmzFiles(doc);
```

### `fromDroneRouteMission(mission, profile)`

Converts the current DroneRoute-like mission shape to the normalized WPMZ model. Use `DJI_FLY_UAV_PROFILE` for the uploaded Lito/Fly sample format.

### `toDroneRouteMission(document)`

Converts a WPMZ document back to a DroneRoute-like import shape. It returns `wpmzActionGroups` on every waypoint so segment actions are not lost even if the current UI only displays reach-point actions.

## Recommended DroneRoute data model change

Keep the existing `actions: WaypointAction[]` for UI compatibility, but add a WPMZ-native sidecar:

```ts
export interface Waypoint {
  // existing fields ...
  actions: WaypointAction[];
  wpmzActionGroups?: ActionGroup[];
}
```

Then:

- UI-created simple actions can still live in `actions` and be converted to one `reachPoint` group.
- Imported DJI Fly/Lito files can preserve `betweenAdjacentPoints`, `parallel`, and multi-waypoint groups in `wpmzActionGroups`.
- Export prefers `wpmzActionGroups` when present.

## Fixture check

From this folder:

```bash
npm run build
node dist/examples/roundtrip-uploaded.js /path/to/mission.kmz
```

For the uploaded sample the expected summary is:

```json
{
  "profileId": "dji-fly-uav",
  "wpmlNamespace": "http://www.uav.com/wpmz/1.0.2",
  "waypointCount": 5,
  "actionGroupCount": 7,
  "actionCount": 8,
  "templateIsMinimal": true
}
```
