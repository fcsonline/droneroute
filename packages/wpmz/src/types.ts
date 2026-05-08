export type KnownString<T extends string> =
  | T
  | (string & { readonly __unknownString?: never });

export type HeadingMode = KnownString<
  "followWayline" | "manually" | "fixed" | "smoothTransition" | "towardPOI"
>;

export type HeadingPathMode = KnownString<
  "clockwise" | "counterClockwise" | "followBadArc"
>;

export type TurnMode = KnownString<
  | "coordinateTurn"
  | "toPointAndStopWithDiscontinuityCurvature"
  | "toPointAndStopWithContinuityCurvature"
  | "toPointAndPassWithContinuityCurvature"
>;

export type HeightMode = KnownString<
  | "EGM96"
  | "relativeToStartPoint"
  | "aboveGroundLevel"
  | "WGS84"
  | "realTimeFollowSurface"
>;
export type ExecuteHeightMode = KnownString<
  "WGS84" | "relativeToStartPoint" | "realTimeFollowSurface"
>;
export type FlyToWaylineMode = KnownString<"safely" | "pointToPoint">;
export type FinishAction = KnownString<
  "goHome" | "noAction" | "autoLand" | "gotoFirstWaypoint"
>;
export type ExitOnRCLost = KnownString<"goContinue" | "executeLostAction">;
export type RCLostAction = KnownString<"goBack" | "landing" | "hover">;
export type ActionGroupMode = KnownString<"sequence" | "parallel">;
export type ActionTriggerType = KnownString<
  "reachPoint" | "betweenAdjacentPoints" | "multipleTiming" | "multipleDistance"
>;

export type ActionFunc = KnownString<
  | "takePhoto"
  | "startRecord"
  | "stopRecord"
  | "focus"
  | "zoom"
  | "customDirName"
  | "gimbalRotate"
  | "gimbalEvenlyRotate"
  | "rotateYaw"
  | "hover"
  | "accurateShoot"
  | "orientedShoot"
  | "panoShot"
>;

export type PrimitiveXmlValue = string | number | boolean;

export interface XmlTextNode {
  readonly kind: "text";
  readonly text: string;
}

export interface XmlElement {
  readonly kind: "element";
  readonly name: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly children: readonly XmlNode[];
}

export type XmlNode = XmlTextNode | XmlElement;

export interface Coordinate {
  readonly longitude: number;
  readonly latitude: number;
  readonly altitude?: number;
}

export interface DroneInfo {
  readonly droneEnumValue?: number;
  readonly droneSubEnumValue?: number;
  readonly extraElements?: readonly XmlElement[];
}

export interface PayloadInfo {
  readonly payloadEnumValue?: number;
  readonly payloadPositionIndex?: number;
  readonly extraElements?: readonly XmlElement[];
}

export interface MissionConfig {
  readonly flyToWaylineMode?: FlyToWaylineMode;
  readonly finishAction?: FinishAction;
  readonly exitOnRCLost?: ExitOnRCLost;
  readonly executeRCLostAction?: RCLostAction;
  readonly takeOffSecurityHeight?: number;
  readonly takeOffRefPoint?: Coordinate;
  readonly takeOffRefPointAGLHeight?: number;
  readonly globalTransitionalSpeed?: number;
  readonly droneInfo?: DroneInfo;
  readonly payloadInfo?: PayloadInfo;
  readonly extraElements?: readonly XmlElement[];
}

export interface WpmzMetadata {
  readonly author?: string;
  /** Preserved exactly as read. DJI enterprise examples use integer ms; DJI Fly-style files may use seconds with decimals. */
  readonly createTime?: string;
  /** Preserved exactly as read. */
  readonly updateTime?: string;
  readonly extraElements?: readonly XmlElement[];
}

export interface WaylineCoordinateSysParam {
  readonly coordinateMode?: string;
  readonly heightMode?: HeightMode;
  readonly globalShootHeight?: number;
  readonly positioningType?: string;
  readonly surfaceFollowModeEnable?: boolean;
  readonly surfaceRelativeHeight?: number;
  readonly extraElements?: readonly XmlElement[];
}

export interface WaypointHeadingParam {
  readonly waypointHeadingMode?: HeadingMode;
  readonly waypointHeadingAngle?: number;
  readonly waypointPoiPoint?: Coordinate;
  readonly waypointHeadingAngleEnable?: boolean;
  readonly waypointHeadingPathMode?: HeadingPathMode;
  readonly waypointHeadingPoiIndex?: number;
  readonly extraElements?: readonly XmlElement[];
}

export interface WaypointTurnParam {
  readonly waypointTurnMode?: TurnMode;
  readonly waypointTurnDampingDist?: number;
  readonly extraElements?: readonly XmlElement[];
}

export interface WaypointGimbalHeadingParam {
  readonly waypointGimbalPitchAngle?: number;
  readonly waypointGimbalYawAngle?: number;
  readonly extraElements?: readonly XmlElement[];
}

export interface ActionTrigger {
  readonly actionTriggerType?: ActionTriggerType;
  readonly actionTriggerParam?: number;
  readonly extraElements?: readonly XmlElement[];
}

export interface WpmzAction {
  readonly actionId?: number;
  readonly actionActuatorFunc: ActionFunc;
  /** Parsed scalar values from actionActuatorFuncParam, indexed by local tag name. */
  readonly params: Readonly<Record<string, PrimitiveXmlValue>>;
  /** Original ordered XML parameter elements. Prefer this for lossless re-emission. */
  readonly paramElements?: readonly XmlElement[];
  readonly extraElements?: readonly XmlElement[];
}

export interface ActionGroup {
  readonly actionGroupId?: number;
  readonly actionGroupStartIndex?: number;
  readonly actionGroupEndIndex?: number;
  readonly actionGroupMode?: ActionGroupMode;
  readonly actionTrigger?: ActionTrigger;
  readonly actions: readonly WpmzAction[];
  readonly extraElements?: readonly XmlElement[];
}

export interface WpmzWaypoint {
  readonly index: number;
  readonly coordinate: Coordinate;
  readonly executeHeight?: number;
  readonly waypointSpeed?: number;
  readonly waypointHeadingParam?: WaypointHeadingParam;
  readonly waypointTurnParam?: WaypointTurnParam;
  readonly useStraightLine?: boolean;
  readonly waypointGimbalHeadingParam?: WaypointGimbalHeadingParam;
  readonly actionGroups: readonly ActionGroup[];
  readonly extraElements?: readonly XmlElement[];
}

export interface TemplateWaypoint {
  readonly index: number;
  readonly coordinate: Coordinate;
  readonly ellipsoidHeight?: number;
  readonly height?: number;
  readonly useGlobalHeight?: boolean;
  readonly useGlobalSpeed?: boolean;
  readonly waypointSpeed?: number;
  readonly useGlobalHeadingParam?: boolean;
  readonly waypointHeadingParam?: WaypointHeadingParam;
  readonly useGlobalTurnParam?: boolean;
  readonly waypointTurnParam?: WaypointTurnParam;
  readonly useStraightLine?: boolean;
  readonly gimbalPitchAngle?: number;
  readonly actionGroups: readonly ActionGroup[];
  readonly extraElements?: readonly XmlElement[];
}

export interface TemplateFolder {
  readonly templateType?: string;
  readonly templateId?: number;
  readonly autoFlightSpeed?: number;
  readonly waylineCoordinateSysParam?: WaylineCoordinateSysParam;
  readonly gimbalPitchMode?: string;
  readonly globalWaypointHeadingParam?: WaypointHeadingParam;
  readonly globalWaypointTurnMode?: TurnMode;
  readonly globalUseStraightLine?: boolean;
  readonly globalHeight?: number;
  readonly waypoints: readonly TemplateWaypoint[];
  readonly extraElements?: readonly XmlElement[];
}

export interface WaylineFolder {
  readonly templateId?: number;
  readonly executeHeightMode?: ExecuteHeightMode;
  readonly waylineId?: number;
  readonly distance?: number;
  readonly duration?: number;
  readonly autoFlightSpeed?: number;
  readonly waylineCoordinateSysParam?: WaylineCoordinateSysParam;
  readonly startActionGroups?: readonly ActionGroup[];
  readonly waypoints: readonly WpmzWaypoint[];
  readonly extraElements?: readonly XmlElement[];
}

export interface WpmzDocument {
  readonly profileId: WpmzProfileId;
  readonly kmlNamespace: string;
  readonly wpmlNamespace: string;
  readonly metadata: WpmzMetadata;
  readonly missionConfig: MissionConfig;
  readonly templateFolder?: TemplateFolder;
  readonly waylines: readonly WaylineFolder[];
  /** Original files are kept so callers can diff or choose exact pass-through behavior. */
  readonly original?: {
    readonly templateKml?: string;
    readonly waylinesWpml?: string;
  };
}

export type WpmzProfileId = "dji-wpml" | "dji-fly-uav" | "custom";

export interface WpmzProfile {
  readonly id: WpmzProfileId;
  readonly kmlNamespace: string;
  readonly wpmlNamespace: string;
  readonly timestampFormat: "milliseconds" | "seconds-float";
  readonly templateStyle: "full-waypoint" | "minimal-mission-config";
  readonly includePayloadInfo: "always" | "when-present" | "never";
  readonly includeTakeOffSecurityHeight: "always" | "when-present" | "never";
  readonly includeWaylineDistanceDuration: "always" | "when-present" | "never";
  readonly waylineHeightModeElement:
    | "executeHeightMode"
    | "waylineCoordinateSysParam";
}

export interface WpmzFiles {
  readonly templateKml: string;
  readonly waylinesWpml: string;
}
