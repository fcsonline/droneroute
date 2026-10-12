// ── Heading & Turn Modes ─────────────────────────────────

export type HeadingMode =
  | "followWayline"
  | "manually"
  | "fixed"
  | "smoothTransition"
  | "towardPOI";

export type TurnMode =
  | "coordinateTurn"
  | "toPointAndStopWithDiscontinuityCurvature"
  | "toPointAndStopWithContinuityCurvature"
  | "toPointAndPassWithContinuityCurvature";

export type HeightMode = "EGM96" | "relativeToStartPoint" | "aboveGroundLevel";

export type FlyToWaylineMode = "safely" | "pointToPoint";

export type FinishAction =
  | "goHome"
  | "noAction"
  | "autoLand"
  | "gotoFirstWaypoint";

export type RCLostAction = "goBack" | "landing" | "hover";

export type GimbalPitchMode = "manual" | "usePointSetting";

// ── Action Types ─────────────────────────────────────────

export type ActionType =
  | "takePhoto"
  | "startRecord"
  | "stopRecord"
  | "gimbalRotate"
  | "gimbalEvenlyRotate"
  | "rotateYaw"
  | "hover"
  | "zoom"
  | "focus";

export interface TakePhotoParams {
  payloadPositionIndex: number;
  fileSuffix?: string;
}

export interface StartRecordParams {
  payloadPositionIndex: number;
  fileSuffix?: string;
}

export interface StopRecordParams {
  payloadPositionIndex: number;
}

export interface GimbalRotateParams {
  gimbalPitchRotateAngle: number; // -120 to 45
  gimbalYawRotateAngle: number; // -180 to 180
  gimbalRollRotateAngle: number; // typically 0
  gimbalRotateMode: "absoluteAngle";
  payloadPositionIndex: number;
}

export interface GimbalEvenlyRotateParams {
  gimbalPitchRotateAngle: number; // -120 to 45 — target pitch at this waypoint
  payloadPositionIndex: number;
}

export interface RotateYawParams {
  aircraftHeading: number; // -180 to 180
  aircraftPathMode: "clockwise" | "counterClockwise";
}

export interface HoverParams {
  hoverTime: number; // seconds
}

export interface ZoomParams {
  focalLength: number; // mm
}

export interface FocusParams {
  isPointFocus: boolean;
  focusX?: number;
  focusY?: number;
  isInfiniteFocus?: boolean;
}

export type ActionParams =
  | TakePhotoParams
  | StartRecordParams
  | StopRecordParams
  | GimbalRotateParams
  | GimbalEvenlyRotateParams
  | RotateYawParams
  | HoverParams
  | ZoomParams
  | FocusParams;

export interface WaypointAction {
  actionId: number;
  actionType: ActionType;
  params: ActionParams;
  /** Imported execution boundaries; absent for actions created in the editor. */
  group?: {
    id: number;
    startIndex: number;
    endIndex: number;
    mode: "sequence" | "parallel";
    triggerType:
      | "reachPoint"
      | "betweenAdjacentPoints"
      | "multipleTiming"
      | "multipleDistance";
    triggerParam?: number;
  };
}

// ── Drone & Payload ──────────────────────────────────────

export interface DroneModel {
  label: string;
  droneEnumValue: number;
  droneSubEnumValue: number;
  /** Optional internal serializer selection; not a DJI aircraft identifier. */
  kmzProfile?: "air3s";
  payloads: PayloadModel[];
}

export interface PayloadModel {
  label: string;
  payloadEnumValue: number;
}

export const DRONE_MODELS: DroneModel[] = [
  {
    label: "DJI M300 RTK",
    droneEnumValue: 60,
    droneSubEnumValue: 0,
    payloads: [
      { label: "H20", payloadEnumValue: 42 },
      { label: "H20T", payloadEnumValue: 43 },
      { label: "H20N", payloadEnumValue: 61 },
      { label: "PSDK", payloadEnumValue: 65534 },
    ],
  },
  {
    label: "DJI M30",
    droneEnumValue: 67,
    droneSubEnumValue: 0,
    payloads: [{ label: "M30 Camera", payloadEnumValue: 52 }],
  },
  {
    label: "DJI M30T",
    droneEnumValue: 67,
    droneSubEnumValue: 1,
    payloads: [{ label: "M30T Camera", payloadEnumValue: 53 }],
  },
  {
    // droneEnumValue 68 appears in real DJI KMZ files (likely Dock-paired M30 variant)
    label: "DJI M30 (Dock)",
    droneEnumValue: 68,
    droneSubEnumValue: 0,
    payloads: [
      { label: "M30 Camera", payloadEnumValue: 52 },
      { label: "M30T Camera", payloadEnumValue: 53 },
    ],
  },
  {
    // Identifiers observed in an Air 3S DJI Fly export. No payloadInfo is emitted.
    label: "DJI Air 3S",
    droneEnumValue: 68,
    droneSubEnumValue: 0,
    kmzProfile: "air3s",
    payloads: [],
  },
  {
    label: "DJI Mavic 3E",
    droneEnumValue: 77,
    droneSubEnumValue: 0,
    payloads: [{ label: "M3E Camera", payloadEnumValue: 66 }],
  },
  {
    label: "DJI Mavic 3T",
    droneEnumValue: 77,
    droneSubEnumValue: 1,
    payloads: [{ label: "M3T Camera", payloadEnumValue: 67 }],
  },
  {
    label: "DJI Mavic 3M",
    droneEnumValue: 77,
    droneSubEnumValue: 2,
    payloads: [{ label: "M3M Camera", payloadEnumValue: 68 }],
  },
  {
    label: "DJI M350 RTK",
    droneEnumValue: 89,
    droneSubEnumValue: 0,
    payloads: [
      { label: "H20", payloadEnumValue: 42 },
      { label: "H20T", payloadEnumValue: 43 },
      { label: "H20N", payloadEnumValue: 61 },
      { label: "H30", payloadEnumValue: 82 },
      { label: "H30T", payloadEnumValue: 83 },
      { label: "PSDK", payloadEnumValue: 65534 },
    ],
  },
  {
    label: "DJI Mavic 3D",
    droneEnumValue: 91,
    droneSubEnumValue: 0,
    payloads: [{ label: "M3D Camera", payloadEnumValue: 80 }],
  },
  {
    label: "DJI Mavic 3TD",
    droneEnumValue: 91,
    droneSubEnumValue: 1,
    payloads: [{ label: "M3TD Camera", payloadEnumValue: 81 }],
  },
  {
    label: "DJI Mini 4 Pro",
    droneEnumValue: 100,
    droneSubEnumValue: 0,
    payloads: [{ label: "Mini 4 Pro Camera", payloadEnumValue: 100 }],
  },
];

// ── Point of Interest ────────────────────────────────────

export interface PointOfInterest {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  height: number;
}

// ── Obstacle ─────────────────────────────────────────────

export interface Obstacle {
  id: string;
  name: string;
  description: string;
  vertices: [number, number][]; // Array of [latitude, longitude] pairs
}

// ── Waypoint ─────────────────────────────────────────────

export interface Waypoint {
  index: number;
  name: string;
  latitude: number;
  longitude: number;
  height: number;
  speed: number;
  useGlobalSpeed: boolean;
  useGlobalHeight: boolean;
  useGlobalHeadingParam: boolean;
  useGlobalTurnParam: boolean;
  headingMode?: HeadingMode;
  headingAngle?: number;
  headingAngleEnable?: boolean;
  useStraightLine?: boolean;
  poiId?: string; // Reference to PointOfInterest when headingMode = "towardPOI"
  turnMode?: TurnMode;
  turnDampingDist?: number;
  gimbalPitchAngle: number;
  actions: WaypointAction[];
}

// ── Mission Config ───────────────────────────────────────

export interface MissionConfig {
  droneEnumValue: number;
  droneSubEnumValue: number;
  /** Missing on existing missions, which retain the legacy KMZ serializer. */
  kmzProfile?: "air3s";
  payloadEnumValue: number;
  flyToWaylineMode: FlyToWaylineMode;
  finishAction: FinishAction;
  exitOnRCLost: "goContinue" | "executeLostAction";
  executeRCLostAction: RCLostAction;
  takeOffSecurityHeight: number;
  globalTransitionalSpeed: number;
  autoFlightSpeed: number;
  maxBatteryMinutes: number;
  heightMode: HeightMode;
  globalHeadingMode: HeadingMode;
  globalTurnMode: TurnMode;
  gimbalPitchMode: GimbalPitchMode;
}

// ── Mission ──────────────────────────────────────────────

export interface Mission {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  config: MissionConfig;
  waypoints: Waypoint[];
  pois: PointOfInterest[];
  obstacles: Obstacle[];
}

// ── Shared Mission ──────────────────────────────────────

export interface SharedMission {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  shareToken: string;
  ownerEmail?: string;
  config: MissionConfig;
  waypoints: Waypoint[];
  pois: PointOfInterest[];
  obstacles: Obstacle[];
}

// ── Admin ────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  createdAt: string;
  lastLoginAt: string | null;
  isAdmin: boolean;
  isBanned: boolean;
  missionCount: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  perPage: number;
  total: number;
}

// ── User Preferences ────────────────────────────────────

export interface VisualizationPreferences {
  viewMode: "2d" | "3d";
  mapStyle: "satellite" | "street";
}

export type UnitSystem = "metric" | "imperial";

export interface UserPreferences {
  unitSystem: UnitSystem;
  visualization: VisualizationPreferences;
  missionDefaults: MissionConfig;
}

// ── Map ──────────────────────────────────────────────────

/** Map center (latitude/longitude) and zoom shown when the app first loads. */
export interface MapViewState {
  latitude: number;
  longitude: number;
  zoom: number;
}

// ── Default Config ───────────────────────────────────────

export const DEFAULT_MISSION_CONFIG: MissionConfig = {
  droneEnumValue: 77,
  droneSubEnumValue: 0,
  payloadEnumValue: 66,
  flyToWaylineMode: "safely",
  finishAction: "goHome",
  exitOnRCLost: "executeLostAction",
  executeRCLostAction: "goBack",
  takeOffSecurityHeight: 20,
  globalTransitionalSpeed: 10,
  autoFlightSpeed: 7,
  maxBatteryMinutes: 25,
  heightMode: "aboveGroundLevel",
  globalHeadingMode: "followWayline",
  globalTurnMode: "toPointAndStopWithDiscontinuityCurvature",
  gimbalPitchMode: "usePointSetting",
};

export const DEFAULT_WAYPOINT: Omit<
  Waypoint,
  "index" | "name" | "latitude" | "longitude"
> = {
  height: 30,
  speed: 7,
  useGlobalSpeed: true,
  useGlobalHeight: false,
  useGlobalHeadingParam: true,
  useGlobalTurnParam: true,
  gimbalPitchAngle: -45,
  actions: [],
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  unitSystem: "metric",
  visualization: {
    viewMode: "2d",
    mapStyle: "satellite",
  },
  missionDefaults: { ...DEFAULT_MISSION_CONFIG },
};

/**
 * Built-in default map view (Barcelona). Used when no DEFAULT_MAP_* env vars are
 * configured, and as the client-side fallback before the config endpoint loads.
 */
export const DEFAULT_MAP_VIEW: MapViewState = {
  latitude: 41.3874,
  longitude: 2.1686,
  zoom: 13,
};

/** DJI Fly profile observed in the supplied Air 3S reference mission. */
export function isAir3S(
  config: Pick<
    MissionConfig,
    "droneEnumValue" | "droneSubEnumValue" | "kmzProfile"
  >,
): boolean {
  return (
    config.kmzProfile === "air3s" &&
    config.droneEnumValue === 68 &&
    config.droneSubEnumValue === 0
  );
}

/** Distinguish profiles even when their DJI numeric identifiers overlap. */
export function getDroneModelKey(
  config: Pick<
    MissionConfig,
    "droneEnumValue" | "droneSubEnumValue" | "kmzProfile"
  >,
): string {
  return `${config.droneEnumValue}-${config.droneSubEnumValue}${config.kmzProfile ? `-${config.kmzProfile}` : ""}`;
}

/** Export checks shared by the editor, saved downloads, and the generator. */
export function getKmzExportError(
  mission: Pick<Mission, "config" | "waypoints" | "pois">,
): string | null {
  const { config, waypoints, pois } = mission;
  if (!isAir3S(config)) return null;
  if (config.heightMode !== "relativeToStartPoint") {
    return "DJI Air 3S requires heights relative to the takeoff point. Review waypoint heights, then select Relative to start. Heights are not converted automatically.";
  }
  if (waypoints.length < 2 || waypoints.length > 200) {
    return "This DJI Air 3S profile supports 2 to 200 waypoints.";
  }
  if (
    ![config.autoFlightSpeed, config.globalTransitionalSpeed].every(
      (n) => Number.isFinite(n) && n > 0 && n <= 15,
    )
  ) {
    return "DJI Air 3S mission speeds must be greater than 0 and at most 15 m/s.";
  }
  if (
    !["safely", "pointToPoint"].includes(config.flyToWaylineMode) ||
    !["goHome", "noAction", "autoLand", "gotoFirstWaypoint"].includes(
      config.finishAction,
    ) ||
    !["goContinue", "executeLostAction"].includes(config.exitOnRCLost) ||
    !["goBack", "landing", "hover"].includes(config.executeRCLostAction)
  )
    return "Unsupported DJI Air 3S flight behavior.";
  if (!["manual", "usePointSetting"].includes(config.gimbalPitchMode))
    return "Unsupported gimbal pitch mode.";
  for (const [i, wp] of waypoints.entries()) {
    if (wp.index !== i)
      return "Reorder the waypoints before exporting: indices must be consecutive from zero.";
    if (
      !Number.isFinite(wp.height) ||
      !Number.isFinite(wp.latitude) ||
      !Number.isFinite(wp.longitude)
    )
      return "Waypoint coordinates and heights must be finite numbers.";
    if (
      !wp.useGlobalSpeed &&
      (!Number.isFinite(wp.speed) || wp.speed <= 0 || wp.speed > 15)
    )
      return "DJI Air 3S waypoint speeds must be greater than 0 and at most 15 m/s.";
    if (
      config.gimbalPitchMode !== "manual" &&
      (!Number.isFinite(wp.gimbalPitchAngle) ||
        wp.gimbalPitchAngle < -90 ||
        wp.gimbalPitchAngle > 60)
    )
      return "DJI Air 3S gimbal pitch must be between -90° and 60°.";
    const heading = wp.useGlobalHeadingParam
      ? config.globalHeadingMode
      : (wp.headingMode ?? config.globalHeadingMode);
    if (
      ![
        "fixed",
        "smoothTransition",
        "followWayline",
        "manually",
        "towardPOI",
      ].includes(heading)
    )
      return "Unsupported DJI Air 3S heading mode.";
    if (
      (wp.headingAngle != null ||
        ["fixed", "smoothTransition"].includes(heading)) &&
      (!Number.isFinite(wp.headingAngle) || Math.abs(wp.headingAngle!) > 180)
    )
      return "Set a heading between -180° and 180° for every waypoint with a custom heading.";
    if (heading === "towardPOI" && !pois.some((p) => p.id === wp.poiId))
      return "Select a valid POI for every waypoint that faces a POI.";
    const turn = wp.useGlobalTurnParam
      ? config.globalTurnMode
      : (wp.turnMode ?? config.globalTurnMode);
    if (
      ![
        "toPointAndStopWithDiscontinuityCurvature",
        "toPointAndStopWithContinuityCurvature",
        "toPointAndPassWithContinuityCurvature",
      ].includes(turn)
    )
      return "This DJI Air 3S profile supports stop or pass-through turns. Select one of these turn modes.";
    if (
      wp.turnDampingDist != null &&
      (!Number.isFinite(wp.turnDampingDist) || wp.turnDampingDist < 0)
    )
      return "Turn damping distances must be finite and non-negative.";
    if (!Array.isArray(wp.actions)) return "Waypoint actions must be a list.";
    for (const action of wp.actions) {
      if (!action || !action.params || typeof action.params !== "object")
        return "Invalid waypoint action.";
      if (
        ![
          "takePhoto",
          "startRecord",
          "stopRecord",
          "gimbalRotate",
          "gimbalEvenlyRotate",
          "rotateYaw",
          "hover",
        ].includes(action.actionType)
      )
        return "This DJI Air 3S profile does not support the selected action. Use photo, video, hover, aircraft heading, or gimbal pitch actions.";
      const p = action.params as unknown as Record<string, unknown>;
      if (p.payloadPositionIndex != null && p.payloadPositionIndex !== 0)
        return "DJI Air 3S uses payload position 0.";
      if (p.gimbalRotateMode != null && p.gimbalRotateMode !== "absoluteAngle")
        return "This DJI Air 3S profile requires absolute gimbal angles.";
      if (
        p.aircraftPathMode != null &&
        !["clockwise", "counterClockwise"].includes(String(p.aircraftPathMode))
      )
        return "Unsupported aircraft rotation direction.";
      if (
        action.actionType === "gimbalRotate" ||
        action.actionType === "gimbalEvenlyRotate"
      ) {
        const pitch = p.gimbalPitchRotateAngle;
        if (
          typeof pitch !== "number" ||
          !Number.isFinite(pitch) ||
          pitch < -90 ||
          pitch > 60
        )
          return "DJI Air 3S gimbal pitch must be between -90° and 60°.";
        if (
          Number(p.gimbalYawRotateAngle ?? 0) !== 0 ||
          Number(p.gimbalRollRotateAngle ?? 0) !== 0
        )
          return "This DJI Air 3S profile supports gimbal pitch only. Set aircraft heading to turn the camera.";
        if (
          action.actionType === "gimbalEvenlyRotate" &&
          i === waypoints.length - 1
        )
          return "A smooth gimbal action needs a following waypoint.";
      }
      if (
        action.actionType === "rotateYaw" &&
        (typeof p.aircraftHeading !== "number" ||
          !Number.isFinite(p.aircraftHeading) ||
          Math.abs(p.aircraftHeading) > 180)
      )
        return "Aircraft heading actions must be between -180° and 180°.";
      if (
        action.actionType === "hover" &&
        (typeof p.hoverTime !== "number" ||
          !Number.isFinite(p.hoverTime) ||
          p.hoverTime < 0)
      )
        return "Hover actions need a valid duration.";
      const g = action.group;
      if (
        g &&
        (!Number.isInteger(g.id) ||
          (g.triggerParam != null &&
            (!Number.isFinite(g.triggerParam) || g.triggerParam <= 0)))
      )
        return "Invalid imported action group.";
      if (
        g &&
        ["multipleTiming", "multipleDistance"].includes(g.triggerType) &&
        g.triggerParam == null
      )
        return "Repeated actions need an interval.";
      if (
        g &&
        action.actionType === "gimbalEvenlyRotate" &&
        g.endIndex !== i + 1
      )
        return "A smooth gimbal action must end at the next waypoint.";
      if (
        g &&
        (g.startIndex !== i ||
          !Number.isInteger(g.endIndex) ||
          g.endIndex < i ||
          g.endIndex >= waypoints.length ||
          !["sequence", "parallel"].includes(g.mode) ||
          ![
            "reachPoint",
            "betweenAdjacentPoints",
            "multipleTiming",
            "multipleDistance",
          ].includes(g.triggerType))
      )
        return "Imported action boundaries no longer match the route. Recreate the affected actions before exporting.";
    }
  }
  return null;
}
