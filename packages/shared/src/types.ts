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
}

// ── Drone & Payload ──────────────────────────────────────

export interface DroneModel {
  label: string;
  droneEnumValue: number;
  droneSubEnumValue: number;
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
  payloadEnumValue: number;
  flyToWaylineMode: FlyToWaylineMode;
  finishAction: FinishAction;
  exitOnRCLost: "goContinue" | "executeLostAction";
  executeRCLostAction: RCLostAction;
  takeOffSecurityHeight: number;
  globalTransitionalSpeed: number;
  autoFlightSpeed: number;
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
}

// ── Default Config ───────────────────────────────────────

export const DEFAULT_MISSION_CONFIG: MissionConfig = {
  droneEnumValue: 67,
  droneSubEnumValue: 0,
  payloadEnumValue: 52,
  flyToWaylineMode: "safely",
  finishAction: "goHome",
  exitOnRCLost: "executeLostAction",
  executeRCLostAction: "goBack",
  takeOffSecurityHeight: 20,
  globalTransitionalSpeed: 10,
  autoFlightSpeed: 7,
  heightMode: "relativeToStartPoint",
  globalHeadingMode: "followWayline",
  globalTurnMode: "toPointAndStopWithDiscontinuityCurvature",
  gimbalPitchMode: "usePointSetting",
};

export const DEFAULT_WAYPOINT: Omit<Waypoint, "index" | "name" | "latitude" | "longitude"> = {
  height: 50,
  speed: 7,
  useGlobalSpeed: true,
  useGlobalHeight: false,
  useGlobalHeadingParam: true,
  useGlobalTurnParam: true,
  gimbalPitchAngle: -45,
  actions: [],
};
