# KMZ regression fixtures

These XML files are derived from two user-supplied reference archives:

- `air3s-native-*`: all six points from a DJI Air 3S DJI Fly export reported by
  the contributor to have flown and taken photographs successfully.
- `m3e-facade-*`: points 0, 1, 90, and 99 of a 100-point DroneRoute M3E wall
  mission, reindexed 0–3. Its template omits custom headings that are present
  in the executable wayline.

Coordinates have been translated to the repository's screenshot area and
rounded to ten decimal places; timestamps have been cleared. Original locations
and original KMZ files are not published. Aircraft IDs, XML namespaces, heights,
headings, camera parameters, and native action groups are retained.

Tests ZIP these documents in memory in their original archive layouts. A
separate test exercises the actual facade planner with a full 10 × 10 grid.
