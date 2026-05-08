import { readFileSync, writeFileSync } from "node:fs";
import { buildWpmzFiles, buildWpmzKmz, readWpmzKmz } from "../src/index.js";

const sourcePath =
  process.argv[2] ?? "/mnt/data/25F903F9-AC77-4A7C-92E8-FD32F4597FC7.kmz";
const source = readFileSync(sourcePath);
const doc = readWpmzKmz(source);
const firstWayline = doc.waylines[0];

console.log(
  JSON.stringify(
    {
      profileId: doc.profileId,
      wpmlNamespace: doc.wpmlNamespace,
      waypointCount: firstWayline?.waypoints.length ?? 0,
      actionGroupCount:
        firstWayline?.waypoints.reduce(
          (sum, wp) => sum + wp.actionGroups.length,
          0,
        ) ?? 0,
      actionCount:
        firstWayline?.waypoints.reduce(
          (sum, wp) =>
            sum +
            wp.actionGroups.reduce(
              (inner, group) => inner + group.actions.length,
              0,
            ),
          0,
        ) ?? 0,
      templateIsMinimal: doc.templateFolder === undefined,
    },
    null,
    2,
  ),
);

const files = buildWpmzFiles(doc);
writeFileSync("/mnt/data/roundtrip-template.kml", files.templateKml);
writeFileSync("/mnt/data/roundtrip-waylines.wpml", files.waylinesWpml);
writeFileSync("/mnt/data/roundtrip.kmz", buildWpmzKmz(doc));
