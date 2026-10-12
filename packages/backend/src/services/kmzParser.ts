import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import type {
  Waypoint,
  MissionConfig,
  WaypointAction,
  PointOfInterest,
} from "@droneroute/shared";
import {
  DEFAULT_MISSION_CONFIG,
  DEFAULT_WAYPOINT,
  isAir3S,
} from "@droneroute/shared";
import { v4 as uuidv4 } from "uuid";

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: false,
  isArray: (name) => {
    return (
      name === "Placemark" ||
      name === "wpml:actionGroup" ||
      name === "wpml:action"
    );
  },
});

function extractCoords(coordStr: string): {
  longitude: number;
  latitude: number;
} {
  const parts = coordStr.split(",").map((s) => parseFloat(s.trim()));
  return { longitude: parts[0], latitude: parts[1] };
}

function parseActions(
  placemark: any,
  preserveGroups: boolean,
): WaypointAction[] {
  const groups = placemark["wpml:actionGroup"];
  if (!groups) return [];

  const actions: WaypointAction[] = [];
  for (const group of groups) {
    const groupActions = group["wpml:action"] || [];
    for (const action of groupActions) {
      actions.push({
        actionId: parseInt(action["wpml:actionId"] || "0"),
        actionType: action["wpml:actionActuatorFunc"],
        params: Object.fromEntries(
          Object.entries(action["wpml:actionActuatorFuncParam"] || {}).map(
            ([key, value]) => [key.replace(/^wpml:/, ""), value],
          ),
        ) as unknown as WaypointAction["params"],
        ...(preserveGroups
          ? {
              group: {
                id: Number(group["wpml:actionGroupId"]),
                startIndex: Number(group["wpml:actionGroupStartIndex"]),
                endIndex: Number(group["wpml:actionGroupEndIndex"]),
                mode: group["wpml:actionGroupMode"],
                triggerType:
                  group["wpml:actionTrigger"]?.["wpml:actionTriggerType"] ??
                  "reachPoint",
                triggerParam:
                  group["wpml:actionTrigger"]?.["wpml:actionTriggerParam"],
              },
            }
          : {}),
      });
    }
  }
  return actions;
}

export async function parseKmz(buffer: Buffer): Promise<{
  config: MissionConfig;
  waypoints: Waypoint[];
  pois: PointOfInterest[];
}> {
  const zip = await JSZip.loadAsync(buffer);

  // Try template.kml at root or inside wpmz/ directory (DJI convention)
  const templateFile =
    zip.file("template.kml") || zip.file("wpmz/template.kml");
  if (!templateFile) {
    throw new Error("Invalid KMZ: missing template.kml");
  }

  const templateXml = await templateFile.async("string");
  const parsed = parser.parse(templateXml);
  const doc = parsed.kml.Document;

  const waylinesFile =
    zip.file("waylines.wpml") || zip.file("wpmz/waylines.wpml");
  const waylinesKml = waylinesFile
    ? parser.parse(await waylinesFile.async("string")).kml
    : undefined;
  const waylinesDoc = waylinesKml?.Document;

  // Parse mission config
  const mc = {
    ...doc["wpml:missionConfig"],
    ...waylinesDoc?.["wpml:missionConfig"],
  };
  const droneInfo = mc["wpml:droneInfo"] || {};
  const payloadInfo = mc["wpml:payloadInfo"] || {};

  // Numeric ID 68/0 alone is ambiguous: legacy M30 Dock missions use it too.
  // Only recognize the Air 3S reference dialect from its DJI Fly namespace.
  const nativeAir3S =
    Number(droneInfo["wpml:droneEnumValue"]) === 68 &&
    Number(droneInfo["wpml:droneSubEnumValue"] ?? 0) === 0 &&
    (waylinesKml ?? parsed.kml)["@_xmlns:wpml"] ===
      "http://www.uav.com/wpmz/1.0.2";

  const config: MissionConfig = {
    ...DEFAULT_MISSION_CONFIG,
    kmzProfile: nativeAir3S ? "air3s" : undefined,
    droneEnumValue: parseInt(droneInfo["wpml:droneEnumValue"] || "67"),
    droneSubEnumValue: parseInt(droneInfo["wpml:droneSubEnumValue"] || "0"),
    payloadEnumValue: Number(
      payloadInfo["wpml:payloadEnumValue"] ?? (nativeAir3S ? 0 : 52),
    ),
    flyToWaylineMode: mc["wpml:flyToWaylineMode"] || "safely",
    finishAction: mc["wpml:finishAction"] || "goHome",
    exitOnRCLost: mc["wpml:exitOnRCLost"] || "executeLostAction",
    executeRCLostAction: mc["wpml:executeRCLostAction"] || "goBack",
    takeOffSecurityHeight: parseFloat(mc["wpml:takeOffSecurityHeight"] || "20"),
    globalTransitionalSpeed: parseFloat(
      mc["wpml:globalTransitionalSpeed"] || "10",
    ),
  };

  // Executable values take precedence. Older DroneRoute templates omit the
  // facade heading/turn overrides even though waylines.wpml contains them.
  const templateFolder = doc.Folder;
  const executionFolder = waylinesDoc?.Folder;
  const folder = templateFolder || executionFolder;

  if (folder) {
    config.autoFlightSpeed = parseFloat(folder["wpml:autoFlightSpeed"] || "7");
    config.gimbalPitchMode =
      folder["wpml:gimbalPitchMode"] || "usePointSetting";
    config.globalTurnMode =
      folder["wpml:globalWaypointTurnMode"] ||
      "toPointAndStopWithDiscontinuityCurvature";

    const headingParam = folder["wpml:globalWaypointHeadingParam"];
    if (headingParam) {
      config.globalHeadingMode =
        headingParam["wpml:waypointHeadingMode"] || "followWayline";
    }

    const coordSys = folder["wpml:waylineCoordinateSysParam"];
    if (coordSys?.["wpml:heightMode"]) {
      config.heightMode = coordSys["wpml:heightMode"];
    } else if (folder["wpml:executeHeightMode"]) {
      // Fallback: some DJI files use executeHeightMode at folder level
      config.heightMode = folder["wpml:executeHeightMode"];
    }
  }

  if (executionFolder?.["wpml:executeHeightMode"])
    config.heightMode = executionFolder["wpml:executeHeightMode"];
  if (executionFolder?.["wpml:autoFlightSpeed"] != null)
    config.autoFlightSpeed = Number(executionFolder["wpml:autoFlightSpeed"]);

  // Parse waypoints and collect POIs from waypointPoiPoint references
  const templates = new Map<number, any>(
    (templateFolder?.Placemark || []).map((pm: any, i: number) => [
      Number(pm["wpml:index"] ?? i),
      pm,
    ]),
  );
  const placemarks = (
    executionFolder?.Placemark ||
    templateFolder?.Placemark ||
    []
  ).map((pm: any, i: number) => {
    const merged = { ...templates.get(Number(pm["wpml:index"] ?? i)), ...pm };
    if (executionFolder) {
      if (pm["wpml:waypointSpeed"] != null) merged["wpml:useGlobalSpeed"] = 0;
      if (pm["wpml:waypointHeadingParam"])
        merged["wpml:useGlobalHeadingParam"] = 0;
      if (pm["wpml:waypointTurnParam"]) merged["wpml:useGlobalTurnParam"] = 0;
    }
    return merged;
  });
  const poiMap = new Map<string, PointOfInterest>(); // key: "lon,lat,height" -> POI

  const waypoints: Waypoint[] = placemarks.map((pm: any, i: number) => {
    const coords = extractCoords(pm.Point.coordinates);
    const actions = parseActions(pm, isAir3S(config));

    // Check for per-waypoint heading params with POI
    const headingParam = pm["wpml:waypointHeadingParam"];
    let headingMode: string | undefined;
    let headingAngle: number | undefined;
    let poiId: string | undefined;

    if (headingParam) {
      headingMode = headingParam["wpml:waypointHeadingMode"];
      headingAngle =
        headingParam["wpml:waypointHeadingAngle"] != null
          ? parseFloat(headingParam["wpml:waypointHeadingAngle"])
          : undefined;
      const poiPoint = headingParam["wpml:waypointPoiPoint"];
      if (headingMode === "towardPOI" && poiPoint) {
        const poiKey = String(poiPoint);
        if (!poiMap.has(poiKey)) {
          const parts = poiKey.split(",").map((s) => parseFloat(s.trim()));
          const poi: PointOfInterest = {
            id: uuidv4(),
            name: `POI ${poiMap.size + 1}`,
            latitude: parts[0],
            longitude: parts[1],
            height: Math.round(parts[2] || 0),
          };
          poiMap.set(poiKey, poi);
        }
        poiId = poiMap.get(poiKey)!.id;
      }
    }

    // Parse turn mode and damping distance
    const turnParam = pm["wpml:waypointTurnParam"];
    const turnMode = turnParam?.["wpml:waypointTurnMode"];
    const turnDampingDist =
      turnParam?.["wpml:waypointTurnDampingDist"] != null
        ? parseFloat(turnParam["wpml:waypointTurnDampingDist"])
        : undefined;

    // Height: try wpml:executeHeight (waylines.wpml), wpml:height, wpml:ellipsoidHeight
    const height = Number(
      pm["wpml:executeHeight"] ??
        pm["wpml:height"] ??
        pm["wpml:ellipsoidHeight"] ??
        50,
    );

    // Gimbal pitch: try direct field or extract from gimbalRotate action
    let gimbalPitchAngle =
      pm["wpml:gimbalPitchAngle"] != null
        ? parseFloat(pm["wpml:gimbalPitchAngle"])
        : undefined;
    if (gimbalPitchAngle == null) {
      // Look for a gimbalRotate action with pitch angle
      const gimbalAction = actions.find((a) => a.actionType === "gimbalRotate");
      const gimbalParams = gimbalAction?.params as any;
      if (gimbalParams?.gimbalPitchRotateAngle != null) {
        gimbalPitchAngle = parseFloat(gimbalParams.gimbalPitchRotateAngle);
      }
    }

    const wpIndex = pm["wpml:index"] != null ? parseInt(pm["wpml:index"]) : i;

    return {
      ...DEFAULT_WAYPOINT,
      index: wpIndex,
      name: `Waypoint ${wpIndex + 1}`,
      latitude: coords.latitude,
      longitude: coords.longitude,
      height,
      speed: parseFloat(
        pm["wpml:waypointSpeed"] || String(config.autoFlightSpeed),
      ),
      useGlobalSpeed:
        pm["wpml:useGlobalSpeed"] === "1" || pm["wpml:useGlobalSpeed"] === 1,
      useGlobalHeight:
        pm["wpml:useGlobalHeight"] === "1" || pm["wpml:useGlobalHeight"] === 1,
      useGlobalHeadingParam:
        pm["wpml:useGlobalHeadingParam"] === "1" ||
        pm["wpml:useGlobalHeadingParam"] === 1,
      useGlobalTurnParam:
        pm["wpml:useGlobalTurnParam"] === "1" ||
        pm["wpml:useGlobalTurnParam"] === 1,
      gimbalPitchAngle: gimbalPitchAngle ?? DEFAULT_WAYPOINT.gimbalPitchAngle,
      headingMode: headingMode as any,
      headingAngle,
      headingAngleEnable:
        headingParam?.["wpml:waypointHeadingAngleEnable"] == null
          ? undefined
          : Number(headingParam["wpml:waypointHeadingAngleEnable"]) === 1,
      useStraightLine:
        pm["wpml:useStraightLine"] == null
          ? undefined
          : Number(pm["wpml:useStraightLine"]) === 1,
      turnMode: turnMode as any,
      turnDampingDist,
      poiId,
      actions,
    };
  });

  // A segment's evenly-rotate action describes its END pitch, not the pitch
  // at the waypoint where the action group is stored.
  for (const wp of waypoints) {
    for (const action of wp.actions) {
      if (action.actionType !== "gimbalEvenlyRotate" || !action.group) continue;
      const end = waypoints.find((p) => p.index === action.group!.endIndex);
      if (end && !end.actions.some((a) => a.actionType === "gimbalRotate")) {
        end.gimbalPitchAngle = (
          action.params as { gimbalPitchRotateAngle: number }
        ).gimbalPitchRotateAngle;
      }
    }
  }

  if (
    isAir3S(config) &&
    !waypoints.some((w) =>
      w.actions.some((a) =>
        ["gimbalRotate", "gimbalEvenlyRotate"].includes(a.actionType),
      ),
    )
  ) {
    config.gimbalPitchMode = "manual";
  }

  const pois = Array.from(poiMap.values());

  return { config, waypoints, pois };
}
