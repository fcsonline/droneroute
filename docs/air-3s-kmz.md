# DJI Air 3S KMZ export

This profile targets the DJI Fly dialect in the supplied `air3S.kmz`. It is
based on a reference mission reported to have flown successfully, plus software
regression tests. Generated files have not yet been flight-tested on an Air 3S.
The identifiers below are observations from that reference, not a published
DJI guarantee for every consumer aircraft or firmware version.

## Findings from the supplied files

| Property                    | DroneRoute `M3E.kmz`                                    | Native `air3S.kmz`                                                 |
| --------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------ |
| Waypoints                   | 100, wall scan                                          | 6, photo route                                                     |
| ZIP paths                   | `template.kml`, `waylines.wpml`, `res/`                 | `wpmz/template.kml`, `wpmz/waylines.wpml`                          |
| WPML namespace              | `http://www.dji.com/wpmz/1.0.2`                         | `http://www.uav.com/wpmz/1.0.2`                                    |
| Aircraft / subtype          | 77 / 0                                                  | 68 / 0                                                             |
| Payload metadata            | Camera 66                                               | No `payloadInfo`                                                   |
| Template route              | Duplicated, missing heading and turn overrides          | No route folder                                                    |
| Executable height reference | `waylineCoordinateSysParam/heightMode=aboveGroundLevel` | `executeHeightMode=relativeToStartPoint`                           |
| Heights                     | 3–12 m                                                  | Fractional values, e.g. 34.6 m                                     |
| Aircraft heading            | `fixed`, angle −176°                                    | `smoothTransition`, angle and enable flag                          |
| Camera pitch                | Plain `gimbalPitchAngle` property                       | Executable gimbal actions                                          |
| Photo parameters            | Payload position and suffix                             | Payload position and `useGlobalPayloadLensIndex=0`                 |
| Actions                     | Photo at each point                                     | Parallel point actions and gimbal actions spanning adjacent points |

Before this change, every selected drone used the same serializer: selecting a
model only changed its aircraft and payload numbers. The Air 3S now has its own
archive layout and serializer. Other models retain their existing export path.
All existing models, including M30, M30T, and M30 (Dock), remain available with
unchanged numeric identifiers and payload choices. Because the existing M30
Dock entry and the Air 3S reference both use 68/0, an optional internal
`kmzProfile: "air3s"` field selects the new serializer. Old saved configurations
without this field retain their original serializer. Selectors, saved mission
labels, and user defaults include the profile in their model identity.

On import, 68/0 is recognized as Air 3S only when the document also uses the
reference DJI Fly namespace (`http://www.uav.com/wpmz/1.0.2`). A legacy M30 Dock
export with the enterprise namespace retains its original model and payload.

## Heading and camera behavior

For a facade, the exporter writes an enabled custom heading at each waypoint
using `smoothTransition`. All points in a straight facade have the same angle,
so the aircraft is commanded to face the wall on both directions of the zigzag.
The enterprise WPML definition of `fixed` holds the yaw after waypoint actions;
it does not mean “set the supplied heading angle”.

With per-point gimbal settings, new missions execute `gimbalRotate` before photo
or video actions in a sequential point group. Gimbal yaw is disabled and based
on the aircraft, as in the reference. Imported action groups retain their point
or segment boundaries, trigger, and parallel/sequence mode. Group IDs are
regenerated uniquely. The first native reference group remains parallel; it is
not rewritten as a sequential facade group.

POI headings are resolved into signed custom angles at the exported waypoints.
The file does not carry a live POI target, so continuous tracking between points
is not guaranteed. Pitch still follows the editor's per-point pitch values.

The profile supports photo, start/stop video, hover, aircraft yaw, and gimbal
pitch actions. Focus, zoom, gimbal yaw/roll, and coordinated turns are rejected
rather than silently translated. Profile limits are 2–200 points and speeds
above zero up to 15 m/s. These are implementation limits, not a complete aircraft
capability specification. Pitch is checked against DJI's controllable −90° to
60° range. Takeoff security height is not written by this dialect; review takeoff
clearance in DJI Fly.

## Recovering an existing wall mission

1. Import the original M3E KMZ. The importer reads executable heading and turn
   settings from `waylines.wpml`, even when `template.kml` omits them.
2. Choose **DJI Air 3S** under **Mission settings**.
3. Establish the takeoff level, then review every waypoint height. Select
   **Relative to start** only after expressing all heights in that reference.
   Merely changing this selector does not convert the numbers.
4. Inspect the route, headings, gimbal angles, and photo actions in the editor.
5. Export the KMZ and inspect the loaded mission in DJI Fly before flying.

For level terrain, if the takeoff point is 2 m above the wall base, a point
intended 10 m above that base is 8 m relative to takeoff. Terrain variation needs
per-point ground elevations; a constant offset cannot solve it. Until the
reference is established, AGL and sea-level missions are blocked at export.

The map and elevation graph are planning previews, not a DJI flight dynamics
simulator. They do not reproduce DJI Fly interpolation or obstacle avoidance.
DJI notes that waypoint trajectories can curve and dip between waypoints.

## Validation and local use

- Unit/integration tests cover the translated reference XML, legacy serializer
  selection, heights, signed heading angles, camera action ordering, unique
  group IDs, segment actions, import/export, API validation, and the actual
  facade planner with 100 points.
- Reference fixture coordinates are translated; private original flight
  locations are not included in the repository or screenshots.
- Run `npm ci`, `npm run build`, and `npm test -w packages/backend`.
- Configure `.env` as described in the main README, including a Mapbox token for
  the map, then run `npm run dev`. No firmware emulator or aircraft simulator is
  bundled. UI screenshots can verify the selector without a map token.

## Sources and limits

- [DJI WPML common elements](https://github.com/dji-sdk/Cloud-API-Doc/blob/master/docs/en/60.api-reference/00.dji-wpml/40.common-element.md): enterprise IDs, heading and action semantics. This does not document the Air 3S dialect.
- [DJI WPML waylines](https://github.com/dji-sdk/Cloud-API-Doc/blob/master/docs/en/60.api-reference/00.dji-wpml/30.waylines-wpml.md): executable height reference and wayline structure.
- [DJI Air 3S specifications](https://www.dji.com/air-3s/specs): controllable gimbal pitch.
- [DJI Air 3S user manual](https://dl.djicdn.com/downloads/DJI_Air_3S/UM/20260423/DJI_Air_3S_um_en1.pdf), Waypoint flight: curved paths and altitude interpolation.

The observed differences explain concrete incompatibilities; they do not prove
which one caused the reported flight behavior. Aircraft/firmware execution
remains to be checked on the target controller and aircraft.
