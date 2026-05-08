import type {
  ActionParams,
  MissionConfig,
  PointOfInterest,
  Waypoint,
  WaypointAction,
  WpmzActionGroup,
} from "@droneroute/shared";
import { DEFAULT_MISSION_CONFIG, DEFAULT_WAYPOINT } from "@droneroute/shared";
import {
  readWpmzKmz,
  toDroneRouteMission,
  type DroneRouteImportResult,
} from "@droneroute/dji-wpmz-universal";

export interface ParsedKmzMission {
  config: MissionConfig;
  waypoints: Waypoint[];
  pois: PointOfInterest[];
  wpmz?: DroneRouteImportResult["wpmz"];
}

export async function parseKmz(buffer: Buffer): Promise<ParsedKmzMission> {
  const document = readWpmzKmz(buffer);
  const imported = toDroneRouteMission(document);
  const config = normalizeConfig(imported.config);

  return {
    config,
    waypoints: imported.waypoints.map((waypoint) =>
      normalizeWaypoint(waypoint, config),
    ),
    pois: imported.pois.map(normalizePoi),
    wpmz: imported.wpmz,
  };
}

function normalizeConfig(
  input: DroneRouteImportResult["config"],
): MissionConfig {
  return {
    ...DEFAULT_MISSION_CONFIG,
    droneEnumValue: input.droneEnumValue,
    droneSubEnumValue: input.droneSubEnumValue,
    payloadEnumValue:
      input.payloadEnumValue ?? DEFAULT_MISSION_CONFIG.payloadEnumValue,
    flyToWaylineMode:
      input.flyToWaylineMode as MissionConfig["flyToWaylineMode"],
    finishAction: input.finishAction as MissionConfig["finishAction"],
    exitOnRCLost: input.exitOnRCLost as MissionConfig["exitOnRCLost"],
    executeRCLostAction:
      input.executeRCLostAction as MissionConfig["executeRCLostAction"],
    takeOffSecurityHeight:
      input.takeOffSecurityHeight ??
      DEFAULT_MISSION_CONFIG.takeOffSecurityHeight,
    globalTransitionalSpeed: input.globalTransitionalSpeed,
    autoFlightSpeed: input.autoFlightSpeed,
    heightMode: normalizeHeightMode(input.heightMode),
    globalHeadingMode:
      input.globalHeadingMode as MissionConfig["globalHeadingMode"],
    globalTurnMode: input.globalTurnMode as MissionConfig["globalTurnMode"],
    gimbalPitchMode:
      (input.gimbalPitchMode as MissionConfig["gimbalPitchMode"]) ??
      DEFAULT_MISSION_CONFIG.gimbalPitchMode,
  };
}

function normalizeWaypoint(
  input: DroneRouteImportResult["waypoints"][number],
  config: MissionConfig,
): Waypoint {
  return {
    ...DEFAULT_WAYPOINT,
    index: input.index,
    name: input.name ?? `Waypoint ${input.index + 1}`,
    latitude: input.latitude,
    longitude: input.longitude,
    height: Math.round(input.height),
    speed: input.speed ?? config.autoFlightSpeed,
    useGlobalSpeed: input.useGlobalSpeed ?? DEFAULT_WAYPOINT.useGlobalSpeed,
    useGlobalHeight: input.useGlobalHeight ?? DEFAULT_WAYPOINT.useGlobalHeight,
    useGlobalHeadingParam:
      input.useGlobalHeadingParam ?? DEFAULT_WAYPOINT.useGlobalHeadingParam,
    useGlobalTurnParam:
      input.useGlobalTurnParam ?? DEFAULT_WAYPOINT.useGlobalTurnParam,
    headingMode: input.headingMode as Waypoint["headingMode"],
    headingAngle: input.headingAngle,
    poiId: input.poiId,
    turnMode: input.turnMode as Waypoint["turnMode"],
    turnDampingDist: input.turnDampingDist,
    gimbalPitchAngle:
      input.gimbalPitchAngle ?? DEFAULT_WAYPOINT.gimbalPitchAngle,
    actions: (input.actions ?? []).map(normalizeAction),
    wpmzActionGroups: input.wpmzActionGroups as
      | readonly WpmzActionGroup[]
      | undefined,
  };
}

function normalizeAction(input: {
  readonly actionId: number;
  readonly actionType: string;
  readonly params: Readonly<Record<string, unknown>>;
}): WaypointAction {
  return {
    actionId: input.actionId,
    actionType: input.actionType,
    params: input.params as unknown as ActionParams,
  };
}

function normalizePoi(input: {
  readonly id: string;
  readonly name?: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly height: number;
}): PointOfInterest {
  return {
    id: input.id,
    name: input.name ?? "POI",
    latitude: input.latitude,
    longitude: input.longitude,
    height: Math.round(input.height),
  };
}

function normalizeHeightMode(
  input: DroneRouteImportResult["config"]["heightMode"],
): MissionConfig["heightMode"] {
  if (
    input === "EGM96" ||
    input === "relativeToStartPoint" ||
    input === "aboveGroundLevel"
  ) {
    if (input === "EGM96") return "EGM96";
    if (input === "relativeToStartPoint") return "relativeToStartPoint";
    return "aboveGroundLevel";
  }
  if (input === "realTimeFollowSurface") return "aboveGroundLevel";
  return "relativeToStartPoint";
}
