import { DJI_FLY_UAV_PROFILE, DJI_WPML_PROFILE } from "./profiles.js";
import type {
  ActionGroup,
  Coordinate,
  ExecuteHeightMode,
  FinishAction,
  FlyToWaylineMode,
  HeadingMode,
  HeightMode,
  RCLostAction,
  TurnMode,
  WpmzAction,
  WpmzDocument,
  WpmzProfile,
} from "./types.js";

export interface DroneRouteMissionLike {
  readonly id?: string;
  readonly name?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly config: DroneRouteMissionConfigLike;
  readonly waypoints: readonly DroneRouteWaypointLike[];
  readonly pois?: readonly DroneRoutePoiLike[];
}

export interface DroneRouteMissionConfigLike {
  readonly droneEnumValue: number;
  readonly droneSubEnumValue: number;
  readonly payloadEnumValue?: number;
  readonly flyToWaylineMode: FlyToWaylineMode;
  readonly finishAction: FinishAction;
  readonly exitOnRCLost: "goContinue" | "executeLostAction" | (string & {});
  readonly executeRCLostAction: RCLostAction;
  readonly takeOffSecurityHeight?: number;
  readonly globalTransitionalSpeed: number;
  readonly autoFlightSpeed: number;
  readonly heightMode: HeightMode;
  readonly globalHeadingMode: HeadingMode;
  readonly globalTurnMode: TurnMode;
  readonly gimbalPitchMode?: string;
}

export interface DroneRouteWaypointLike {
  readonly index: number;
  readonly name?: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly height: number;
  readonly speed?: number;
  readonly useGlobalSpeed?: boolean;
  readonly useGlobalHeight?: boolean;
  readonly useGlobalHeadingParam?: boolean;
  readonly useGlobalTurnParam?: boolean;
  readonly headingMode?: HeadingMode;
  readonly headingAngle?: number;
  readonly poiId?: string;
  readonly turnMode?: TurnMode;
  readonly turnDampingDist?: number;
  readonly useStraightLine?: boolean;
  readonly gimbalPitchAngle?: number;
  readonly actions?: readonly DroneRouteActionLike[];
  /** Optional extension: use this to preserve Lito/Fly segment-trigger groups. */
  readonly wpmzActionGroups?: readonly ActionGroup[];
}

export interface DroneRoutePoiLike {
  readonly id: string;
  readonly name?: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly height: number;
}

export interface DroneRouteActionLike {
  readonly actionId: number;
  readonly actionType: string;
  readonly params: Readonly<Record<string, unknown>>;
}

export interface DroneRouteImportResult {
  readonly config: DroneRouteMissionConfigLike;
  readonly waypoints: readonly (DroneRouteWaypointLike & {
    readonly wpmzActionGroups: readonly ActionGroup[];
  })[];
  readonly pois: readonly DroneRoutePoiLike[];
  readonly wpmz: {
    readonly profileId: WpmzDocument["profileId"];
    readonly wpmlNamespace: string;
    readonly sourceHadTemplateFolder: boolean;
  };
}

export function fromDroneRouteMission(
  mission: DroneRouteMissionLike,
  profile: WpmzProfile = DJI_WPML_PROFILE,
): WpmzDocument {
  const firstPoi = mission.pois?.[0];
  const templateId = 0;
  const waylineId = 0;
  const waypointActionGroups = mission.waypoints.map(
    (waypoint) =>
      waypoint.wpmzActionGroups ?? flatActionsToActionGroups(waypoint),
  );

  return {
    profileId: profile.id,
    kmlNamespace: profile.kmlNamespace,
    wpmlNamespace: profile.wpmlNamespace,
    metadata: {
      author: mission.id,
      createTime: mission.createdAt
        ? dateishToTimestamp(mission.createdAt, profile)
        : undefined,
      updateTime: mission.updatedAt
        ? dateishToTimestamp(mission.updatedAt, profile)
        : undefined,
    },
    missionConfig: {
      flyToWaylineMode: mission.config.flyToWaylineMode,
      finishAction: mission.config.finishAction,
      exitOnRCLost: mission.config.exitOnRCLost,
      executeRCLostAction: mission.config.executeRCLostAction,
      takeOffSecurityHeight: mission.config.takeOffSecurityHeight,
      globalTransitionalSpeed: mission.config.globalTransitionalSpeed,
      droneInfo: {
        droneEnumValue: mission.config.droneEnumValue,
        droneSubEnumValue: mission.config.droneSubEnumValue,
      },
      ...(mission.config.payloadEnumValue !== undefined
        ? {
            payloadInfo: {
              payloadEnumValue: mission.config.payloadEnumValue,
              payloadPositionIndex: 0,
            },
          }
        : {}),
    },
    templateFolder:
      profile.templateStyle === "full-waypoint"
        ? {
            templateType: "waypoint",
            templateId,
            autoFlightSpeed: mission.config.autoFlightSpeed,
            waylineCoordinateSysParam: {
              coordinateMode: "WGS84",
              heightMode: mission.config.heightMode,
            },
            gimbalPitchMode:
              mission.config.gimbalPitchMode ?? "usePointSetting",
            globalWaypointHeadingParam: {
              waypointHeadingMode: mission.config.globalHeadingMode,
              waypointHeadingAngle: 0,
              waypointHeadingPathMode: "followBadArc",
              ...(firstPoi
                ? { waypointPoiPoint: poiToCoordinate(firstPoi) }
                : {}),
            },
            globalWaypointTurnMode: mission.config.globalTurnMode,
            globalUseStraightLine: false,
            waypoints: mission.waypoints.map((waypoint, i) => ({
              index: waypoint.index,
              coordinate: {
                longitude: waypoint.longitude,
                latitude: waypoint.latitude,
              },
              ellipsoidHeight: waypoint.height,
              height: waypoint.height,
              useGlobalHeight: waypoint.useGlobalHeight ?? false,
              useGlobalSpeed: waypoint.useGlobalSpeed ?? true,
              waypointSpeed: waypoint.speed,
              useGlobalHeadingParam: waypoint.useGlobalHeadingParam ?? true,
              waypointHeadingParam: buildHeadingParam(
                waypoint,
                mission.pois,
                mission.config.globalHeadingMode,
              ),
              useGlobalTurnParam: waypoint.useGlobalTurnParam ?? true,
              waypointTurnParam: {
                waypointTurnMode:
                  waypoint.turnMode ?? mission.config.globalTurnMode,
                waypointTurnDampingDist: waypoint.turnDampingDist ?? 0,
              },
              useStraightLine: waypoint.useStraightLine ?? false,
              gimbalPitchAngle: waypoint.gimbalPitchAngle ?? 0,
              actionGroups: waypointActionGroups[i] ?? [],
            })),
          }
        : undefined,
    waylines: [
      {
        templateId,
        executeHeightMode: toExecuteHeightMode(mission.config.heightMode),
        waylineId,
        distance: profile === DJI_FLY_UAV_PROFILE ? 0 : undefined,
        duration: profile === DJI_FLY_UAV_PROFILE ? 0 : undefined,
        autoFlightSpeed: mission.config.autoFlightSpeed,
        waypoints: mission.waypoints.map((waypoint, i) => ({
          index: waypoint.index,
          coordinate: {
            longitude: waypoint.longitude,
            latitude: waypoint.latitude,
          },
          executeHeight: waypoint.height,
          waypointSpeed:
            waypoint.useGlobalSpeed === false
              ? waypoint.speed
              : mission.config.autoFlightSpeed,
          waypointHeadingParam: buildHeadingParam(
            waypoint,
            mission.pois,
            mission.config.globalHeadingMode,
          ),
          waypointTurnParam: {
            waypointTurnMode:
              waypoint.useGlobalTurnParam === false
                ? (waypoint.turnMode ?? mission.config.globalTurnMode)
                : mission.config.globalTurnMode,
            waypointTurnDampingDist: waypoint.turnDampingDist ?? 0,
          },
          useStraightLine: waypoint.useStraightLine ?? false,
          waypointGimbalHeadingParam: {
            waypointGimbalPitchAngle: waypoint.gimbalPitchAngle ?? 0,
            waypointGimbalYawAngle: 0,
          },
          actionGroups: waypointActionGroups[i] ?? [],
        })),
      },
    ],
  };
}

export function toDroneRouteMission(
  document: WpmzDocument,
): DroneRouteImportResult {
  const firstWayline = document.waylines[0];
  const pois = collectPois(document);
  const config: DroneRouteMissionConfigLike = {
    droneEnumValue: document.missionConfig.droneInfo?.droneEnumValue ?? 0,
    droneSubEnumValue: document.missionConfig.droneInfo?.droneSubEnumValue ?? 0,
    ...(document.missionConfig.payloadInfo?.payloadEnumValue !== undefined
      ? {
          payloadEnumValue: document.missionConfig.payloadInfo.payloadEnumValue,
        }
      : {}),
    flyToWaylineMode: document.missionConfig.flyToWaylineMode ?? "safely",
    finishAction: document.missionConfig.finishAction ?? "goHome",
    exitOnRCLost: document.missionConfig.exitOnRCLost ?? "executeLostAction",
    executeRCLostAction: document.missionConfig.executeRCLostAction ?? "goBack",
    takeOffSecurityHeight: document.missionConfig.takeOffSecurityHeight,
    globalTransitionalSpeed:
      document.missionConfig.globalTransitionalSpeed ??
      firstWayline?.autoFlightSpeed ??
      2.5,
    autoFlightSpeed:
      firstWayline?.autoFlightSpeed ??
      document.missionConfig.globalTransitionalSpeed ??
      2.5,
    heightMode:
      firstWayline?.executeHeightMode ??
      firstWayline?.waylineCoordinateSysParam?.heightMode ??
      "relativeToStartPoint",
    globalHeadingMode:
      firstWayline?.waypoints[0]?.waypointHeadingParam?.waypointHeadingMode ??
      "followWayline",
    globalTurnMode:
      firstWayline?.waypoints[0]?.waypointTurnParam?.waypointTurnMode ??
      "toPointAndStopWithDiscontinuityCurvature",
    gimbalPitchMode:
      document.templateFolder?.gimbalPitchMode ?? "usePointSetting",
  };

  const waypoints = (firstWayline?.waypoints ?? []).map((waypoint) => {
    const reachPointActions = waypoint.actionGroups
      .filter(
        (group) => group.actionTrigger?.actionTriggerType === "reachPoint",
      )
      .flatMap((group) => group.actions)
      .map(wpmzActionToDroneRouteAction);
    const headingPoi = waypoint.waypointHeadingParam?.waypointPoiPoint;
    const poiId = headingPoi ? poiIdForCoordinate(headingPoi) : undefined;

    return {
      index: waypoint.index,
      name: `Waypoint ${waypoint.index + 1}`,
      latitude: waypoint.coordinate.latitude,
      longitude: waypoint.coordinate.longitude,
      height: waypoint.executeHeight ?? 0,
      speed: waypoint.waypointSpeed ?? config.autoFlightSpeed,
      useGlobalSpeed:
        waypoint.waypointSpeed === undefined ||
        waypoint.waypointSpeed === config.autoFlightSpeed,
      useGlobalHeight: false,
      useGlobalHeadingParam:
        waypoint.waypointHeadingParam?.waypointHeadingMode ===
        config.globalHeadingMode,
      useGlobalTurnParam:
        waypoint.waypointTurnParam?.waypointTurnMode === config.globalTurnMode,
      headingMode: waypoint.waypointHeadingParam?.waypointHeadingMode,
      headingAngle: waypoint.waypointHeadingParam?.waypointHeadingAngle,
      ...(poiId ? { poiId } : {}),
      turnMode: waypoint.waypointTurnParam?.waypointTurnMode,
      turnDampingDist: waypoint.waypointTurnParam?.waypointTurnDampingDist,
      useStraightLine: waypoint.useStraightLine,
      gimbalPitchAngle:
        waypoint.waypointGimbalHeadingParam?.waypointGimbalPitchAngle,
      actions: reachPointActions,
      wpmzActionGroups: waypoint.actionGroups,
    };
  });

  return {
    config,
    waypoints,
    pois,
    wpmz: {
      profileId: document.profileId,
      wpmlNamespace: document.wpmlNamespace,
      sourceHadTemplateFolder: document.templateFolder !== undefined,
    },
  };
}

function flatActionsToActionGroups(
  waypoint: DroneRouteWaypointLike,
): readonly ActionGroup[] {
  const actions = waypoint.actions ?? [];
  if (actions.length === 0) return [];
  return [
    {
      actionGroupId: 0,
      actionGroupStartIndex: waypoint.index,
      actionGroupEndIndex: waypoint.index,
      actionGroupMode: "sequence",
      actionTrigger: { actionTriggerType: "reachPoint" },
      actions: actions.map(droneRouteActionToWpmzAction),
    },
  ];
}

function droneRouteActionToWpmzAction(
  action: DroneRouteActionLike,
): WpmzAction {
  return {
    actionId: action.actionId,
    actionActuatorFunc: action.actionType,
    params: normalizeActionParams(action.params),
  };
}

function wpmzActionToDroneRouteAction(
  action: WpmzAction,
): DroneRouteActionLike {
  return {
    actionId: action.actionId ?? 0,
    actionType: action.actionActuatorFunc,
    params: action.params,
  };
}

function normalizeActionParams(
  params: Readonly<Record<string, unknown>>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    )
      out[key] = value;
  }
  return out;
}

function buildHeadingParam(
  waypoint: DroneRouteWaypointLike,
  pois: readonly DroneRoutePoiLike[] | undefined,
  fallback: HeadingMode,
) {
  const mode = waypoint.headingMode ?? fallback;
  const poi = waypoint.poiId
    ? pois?.find((candidate) => candidate.id === waypoint.poiId)
    : undefined;
  return {
    waypointHeadingMode: mode,
    waypointHeadingAngle: waypoint.headingAngle ?? 0,
    waypointHeadingAngleEnable: mode !== "manually",
    waypointHeadingPathMode: "followBadArc" as const,
    ...(poi
      ? { waypointHeadingPoiIndex: 0, waypointPoiPoint: poiToCoordinate(poi) }
      : {}),
  };
}

function toExecuteHeightMode(heightMode: HeightMode): ExecuteHeightMode {
  if (heightMode === "EGM96") return "WGS84";
  if (heightMode === "aboveGroundLevel") return "relativeToStartPoint";
  return heightMode;
}

function collectPois(document: WpmzDocument): DroneRoutePoiLike[] {
  const seen = new Map<string, DroneRoutePoiLike>();
  for (const wayline of document.waylines) {
    for (const waypoint of wayline.waypoints) {
      const poi = waypoint.waypointHeadingParam?.waypointPoiPoint;
      if (!poi) continue;
      if (poi.latitude === 0 && poi.longitude === 0) continue;
      const id = poiIdForCoordinate(poi);
      if (!seen.has(id))
        seen.set(id, {
          id,
          name: `POI ${seen.size + 1}`,
          latitude: poi.latitude,
          longitude: poi.longitude,
          height: poi.altitude ?? 0,
        });
    }
  }
  return [...seen.values()];
}

function poiIdForCoordinate(coordinate: Coordinate): string {
  return `poi:${coordinate.latitude.toFixed(6)},${coordinate.longitude.toFixed(6)},${(coordinate.altitude ?? 0).toFixed(2)}`;
}

function poiToCoordinate(poi: DroneRoutePoiLike): Coordinate {
  return {
    latitude: poi.latitude,
    longitude: poi.longitude,
    altitude: poi.height,
  };
}

function dateishToTimestamp(value: string, profile: WpmzProfile): string {
  const asNumber = Number(value);
  if (Number.isFinite(asNumber)) return value;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return value;
  return profile.timestampFormat === "seconds-float"
    ? (ms / 1000).toFixed(4)
    : String(ms);
}
