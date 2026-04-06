import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import type { Mission, Waypoint, MissionConfig, WaypointAction, PointOfInterest } from "@droneroute/shared";
import { DEFAULT_MISSION_CONFIG, DEFAULT_WAYPOINT } from "@droneroute/shared";
import { v4 as uuidv4 } from "uuid";

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: false,
  isArray: (name) => {
    return name === "Placemark" || name === "wpml:actionGroup" || name === "wpml:action";
  },
});

function extractCoords(coordStr: string): { longitude: number; latitude: number } {
  const parts = coordStr.split(",").map((s) => parseFloat(s.trim()));
  return { longitude: parts[0], latitude: parts[1] };
}

function parseActions(placemark: any): WaypointAction[] {
  const groups = placemark["wpml:actionGroup"];
  if (!groups) return [];

  const actions: WaypointAction[] = [];
  for (const group of groups) {
    const groupActions = group["wpml:action"] || [];
    for (const action of groupActions) {
      actions.push({
        actionId: parseInt(action["wpml:actionId"] || "0"),
        actionType: action["wpml:actionActuatorFunc"],
        params: action["wpml:actionActuatorFuncParam"] || {},
      });
    }
  }
  return actions;
}

export async function parseKmz(
  buffer: Buffer
): Promise<{ config: MissionConfig; waypoints: Waypoint[]; pois: PointOfInterest[] }> {
  const zip = await JSZip.loadAsync(buffer);

  // Try template.kml at root or inside wpmz/ directory (DJI convention)
  const templateFile = zip.file("template.kml") || zip.file("wpmz/template.kml");
  if (!templateFile) {
    throw new Error("Invalid KMZ: missing template.kml");
  }

  const templateXml = await templateFile.async("string");
  const parsed = parser.parse(templateXml);
  const doc = parsed.kml.Document;

  // Parse mission config
  const mc = doc["wpml:missionConfig"] || {};
  const droneInfo = mc["wpml:droneInfo"] || {};
  const payloadInfo = mc["wpml:payloadInfo"] || {};

  const config: MissionConfig = {
    ...DEFAULT_MISSION_CONFIG,
    droneEnumValue: parseInt(droneInfo["wpml:droneEnumValue"] || "67"),
    droneSubEnumValue: parseInt(droneInfo["wpml:droneSubEnumValue"] || "0"),
    payloadEnumValue: parseInt(payloadInfo["wpml:payloadEnumValue"] || "52"),
    flyToWaylineMode: mc["wpml:flyToWaylineMode"] || "safely",
    finishAction: mc["wpml:finishAction"] || "goHome",
    exitOnRCLost: mc["wpml:exitOnRCLost"] || "executeLostAction",
    executeRCLostAction: mc["wpml:executeRCLostAction"] || "goBack",
    takeOffSecurityHeight: parseFloat(mc["wpml:takeOffSecurityHeight"] || "20"),
    globalTransitionalSpeed: parseFloat(mc["wpml:globalTransitionalSpeed"] || "10"),
  };

  // Parse folder
  const folder = doc.Folder;
  if (folder) {
    config.autoFlightSpeed = parseFloat(folder["wpml:autoFlightSpeed"] || "7");
    config.gimbalPitchMode = folder["wpml:gimbalPitchMode"] || "usePointSetting";
    config.globalTurnMode =
      folder["wpml:globalWaypointTurnMode"] ||
      "toPointAndStopWithDiscontinuityCurvature";

    const headingParam = folder["wpml:globalWaypointHeadingParam"];
    if (headingParam) {
      config.globalHeadingMode =
        headingParam["wpml:waypointHeadingMode"] || "followWayline";
    }

    const coordSys = folder["wpml:waylineCoordinateSysParam"];
    if (coordSys) {
      config.heightMode = coordSys["wpml:heightMode"] || "relativeToStartPoint";
    }
  }

  // Parse waypoints and collect POIs from waypointPoiPoint references
  const placemarks = folder?.Placemark || [];
  const poiMap = new Map<string, PointOfInterest>(); // key: "lon,lat,height" -> POI

  const waypoints: Waypoint[] = placemarks.map((pm: any) => {
    const coords = extractCoords(pm.Point.coordinates);
    const actions = parseActions(pm);

    // Check for per-waypoint heading params with POI
    const headingParam = pm["wpml:waypointHeadingParam"];
    let headingMode: string | undefined;
    let poiId: string | undefined;

    if (headingParam) {
      headingMode = headingParam["wpml:waypointHeadingMode"];
      const poiPoint = headingParam["wpml:waypointPoiPoint"];
      if (headingMode === "towardPOI" && poiPoint) {
        const poiKey = String(poiPoint);
        if (!poiMap.has(poiKey)) {
          const parts = poiKey.split(",").map((s) => parseFloat(s.trim()));
          const poi: PointOfInterest = {
            id: uuidv4(),
            name: `POI ${poiMap.size + 1}`,
            longitude: parts[0],
            latitude: parts[1],
            height: parts[2] || 0,
          };
          poiMap.set(poiKey, poi);
        }
        poiId = poiMap.get(poiKey)!.id;
      }
    }

    return {
      ...DEFAULT_WAYPOINT,
      index: parseInt(pm["wpml:index"] || "0"),
      latitude: coords.latitude,
      longitude: coords.longitude,
      height: parseFloat(pm["wpml:height"] || pm["wpml:ellipsoidHeight"] || "50"),
      speed: parseFloat(pm["wpml:waypointSpeed"] || String(config.autoFlightSpeed)),
      useGlobalSpeed: pm["wpml:useGlobalSpeed"] === "1" || pm["wpml:useGlobalSpeed"] === 1,
      useGlobalHeight: pm["wpml:useGlobalHeight"] === "1" || pm["wpml:useGlobalHeight"] === 1,
      useGlobalHeadingParam: pm["wpml:useGlobalHeadingParam"] === "1" || pm["wpml:useGlobalHeadingParam"] === 1,
      useGlobalTurnParam: pm["wpml:useGlobalTurnParam"] === "1" || pm["wpml:useGlobalTurnParam"] === 1,
      gimbalPitchAngle: parseFloat(pm["wpml:gimbalPitchAngle"] || "-90"),
      headingMode: headingMode as any,
      poiId,
      actions,
    };
  });

  const pois = Array.from(poiMap.values());

  return { config, waypoints, pois };
}
