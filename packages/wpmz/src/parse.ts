import { inferProfileFromFiles } from "./profiles.js";
import type {
  ActionGroup,
  ActionTrigger,
  Coordinate,
  DroneInfo,
  MissionConfig,
  PayloadInfo,
  TemplateFolder,
  TemplateWaypoint,
  WaylineCoordinateSysParam,
  WaylineFolder,
  WaypointGimbalHeadingParam,
  WaypointHeadingParam,
  WaypointTurnParam,
  WpmzAction,
  WpmzDocument,
  WpmzFiles,
  WpmzMetadata,
  WpmzWaypoint,
  XmlElement,
} from "./types.js";
import {
  childBoolean,
  childNumber,
  childText,
  childrenByLocalName,
  compactObject,
  elementChildren,
  extraElements,
  firstChildByLocalName,
  localName,
  parseCoordinate,
  parseLatLonAltCoordinate,
  parseXml,
  primitiveFromText,
  textContent,
} from "./xml.js";

const METADATA_KNOWN = new Set([
  "author",
  "createTime",
  "updateTime",
  "missionConfig",
  "Folder",
]);
const MISSION_KNOWN = new Set([
  "flyToWaylineMode",
  "finishAction",
  "exitOnRCLost",
  "executeRCLostAction",
  "takeOffSecurityHeight",
  "takeOffRefPoint",
  "takeOffRefPointAGLHeight",
  "globalTransitionalSpeed",
  "droneInfo",
  "payloadInfo",
]);
const DRONE_INFO_KNOWN = new Set(["droneEnumValue", "droneSubEnumValue"]);
const PAYLOAD_INFO_KNOWN = new Set([
  "payloadEnumValue",
  "payloadPositionIndex",
]);
const COORD_SYS_KNOWN = new Set([
  "coordinateMode",
  "heightMode",
  "globalShootHeight",
  "positioningType",
  "surfaceFollowModeEnable",
  "surfaceRelativeHeight",
]);
const HEADING_KNOWN = new Set([
  "waypointHeadingMode",
  "waypointHeadingAngle",
  "waypointPoiPoint",
  "waypointHeadingAngleEnable",
  "waypointHeadingPathMode",
  "waypointHeadingPoiIndex",
]);
const TURN_KNOWN = new Set(["waypointTurnMode", "waypointTurnDampingDist"]);
const GIMBAL_HEADING_KNOWN = new Set([
  "waypointGimbalPitchAngle",
  "waypointGimbalYawAngle",
]);
const ACTION_TRIGGER_KNOWN = new Set([
  "actionTriggerType",
  "actionTriggerParam",
]);
const ACTION_KNOWN = new Set([
  "actionId",
  "actionActuatorFunc",
  "actionActuatorFuncParam",
]);
const ACTION_GROUP_KNOWN = new Set([
  "actionGroupId",
  "actionGroupStartIndex",
  "actionGroupEndIndex",
  "actionGroupMode",
  "actionTrigger",
  "action",
]);
const WAYLINE_FOLDER_KNOWN = new Set([
  "templateId",
  "executeHeightMode",
  "waylineId",
  "distance",
  "duration",
  "autoFlightSpeed",
  "waylineCoordinateSysParam",
  "startActionGroup",
  "Placemark",
]);
const WAYPOINT_KNOWN = new Set([
  "Point",
  "index",
  "executeHeight",
  "waypointSpeed",
  "waypointHeadingParam",
  "waypointTurnParam",
  "useStraightLine",
  "actionGroup",
  "waypointGimbalHeadingParam",
]);
const TEMPLATE_FOLDER_KNOWN = new Set([
  "templateType",
  "templateId",
  "autoFlightSpeed",
  "waylineCoordinateSysParam",
  "gimbalPitchMode",
  "globalWaypointHeadingParam",
  "globalWaypointTurnMode",
  "globalUseStraightLine",
  "globalHeight",
  "Placemark",
]);
const TEMPLATE_WAYPOINT_KNOWN = new Set([
  "Point",
  "index",
  "ellipsoidHeight",
  "height",
  "useGlobalHeight",
  "useGlobalSpeed",
  "waypointSpeed",
  "useGlobalHeadingParam",
  "waypointHeadingParam",
  "useGlobalTurnParam",
  "waypointTurnParam",
  "useStraightLine",
  "gimbalPitchAngle",
  "actionGroup",
]);

export function parseWpmzFiles(files: WpmzFiles): WpmzDocument {
  const templateRoot = parseXml(files.templateKml);
  const waylinesRoot = parseXml(files.waylinesWpml);
  const profile = inferProfileFromFiles(files);
  const templateDoc = firstChildByLocalName(templateRoot, "Document");
  const waylinesDoc = firstChildByLocalName(waylinesRoot, "Document");

  const templateMissionConfig = parseMissionConfig(
    firstChildByLocalName(templateDoc, "missionConfig"),
  );
  const waylinesMissionConfig = parseMissionConfig(
    firstChildByLocalName(waylinesDoc, "missionConfig"),
  );
  const missionConfig = mergeMissionConfig(
    templateMissionConfig,
    waylinesMissionConfig,
  );
  const metadata = parseMetadata(templateDoc);
  const templateFolder = parseTemplateFolder(
    firstChildByLocalName(templateDoc, "Folder"),
  );
  const waylines = childrenByLocalName(
    waylinesDoc ?? waylinesRoot,
    "Folder",
  ).map(parseWaylineFolder);

  return {
    profileId: profile.id,
    kmlNamespace: templateRoot.attributes.xmlns ?? profile.kmlNamespace,
    wpmlNamespace:
      templateRoot.attributes["xmlns:wpml"] ??
      waylinesRoot.attributes["xmlns:wpml"] ??
      profile.wpmlNamespace,
    metadata,
    missionConfig,
    ...(templateFolder ? { templateFolder } : {}),
    waylines,
    original: files,
  };
}

export function parseTemplateKml(
  templateKml: string,
): Pick<
  WpmzDocument,
  | "metadata"
  | "missionConfig"
  | "templateFolder"
  | "kmlNamespace"
  | "wpmlNamespace"
  | "profileId"
> {
  const root = parseXml(templateKml);
  const doc = firstChildByLocalName(root, "Document");
  const profile = inferProfileFromFiles({ templateKml });
  const templateFolder = parseTemplateFolder(
    firstChildByLocalName(doc, "Folder"),
  );
  return {
    metadata: parseMetadata(doc),
    missionConfig: parseMissionConfig(
      firstChildByLocalName(doc, "missionConfig"),
    ),
    ...(templateFolder ? { templateFolder } : {}),
    kmlNamespace: root.attributes.xmlns ?? profile.kmlNamespace,
    wpmlNamespace: root.attributes["xmlns:wpml"] ?? profile.wpmlNamespace,
    profileId: profile.id,
  };
}

export function parseWaylinesWpml(
  waylinesWpml: string,
): Pick<
  WpmzDocument,
  "missionConfig" | "waylines" | "kmlNamespace" | "wpmlNamespace" | "profileId"
> {
  const root = parseXml(waylinesWpml);
  const doc = firstChildByLocalName(root, "Document");
  const profile = inferProfileFromFiles({ waylinesWpml });
  return {
    missionConfig: parseMissionConfig(
      firstChildByLocalName(doc, "missionConfig"),
    ),
    waylines: childrenByLocalName(doc ?? root, "Folder").map(
      parseWaylineFolder,
    ),
    kmlNamespace: root.attributes.xmlns ?? profile.kmlNamespace,
    wpmlNamespace: root.attributes["xmlns:wpml"] ?? profile.wpmlNamespace,
    profileId: profile.id,
  };
}

function parseMetadata(document: XmlElement | undefined): WpmzMetadata {
  return compactObject({
    author: childText(document, "author"),
    createTime: childText(document, "createTime"),
    updateTime: childText(document, "updateTime"),
    extraElements: extraElements(document, METADATA_KNOWN),
  });
}

function parseMissionConfig(element: XmlElement | undefined): MissionConfig {
  return compactObject({
    flyToWaylineMode: childText(element, "flyToWaylineMode"),
    finishAction: childText(element, "finishAction"),
    exitOnRCLost: childText(element, "exitOnRCLost"),
    executeRCLostAction: childText(element, "executeRCLostAction"),
    takeOffSecurityHeight: childNumber(element, "takeOffSecurityHeight"),
    takeOffRefPoint: parseLatLonAltCoordinate(
      childText(element, "takeOffRefPoint"),
    ),
    takeOffRefPointAGLHeight: childNumber(element, "takeOffRefPointAGLHeight"),
    globalTransitionalSpeed: childNumber(element, "globalTransitionalSpeed"),
    droneInfo: parseDroneInfo(firstChildByLocalName(element, "droneInfo")),
    payloadInfo: parsePayloadInfo(
      firstChildByLocalName(element, "payloadInfo"),
    ),
    extraElements: extraElements(element, MISSION_KNOWN),
  });
}

function parseDroneInfo(
  element: XmlElement | undefined,
): DroneInfo | undefined {
  if (!element) return undefined;
  return compactObject({
    droneEnumValue: childNumber(element, "droneEnumValue"),
    droneSubEnumValue: childNumber(element, "droneSubEnumValue"),
    extraElements: extraElements(element, DRONE_INFO_KNOWN),
  });
}

function parsePayloadInfo(
  element: XmlElement | undefined,
): PayloadInfo | undefined {
  if (!element) return undefined;
  return compactObject({
    payloadEnumValue: childNumber(element, "payloadEnumValue"),
    payloadPositionIndex: childNumber(element, "payloadPositionIndex"),
    extraElements: extraElements(element, PAYLOAD_INFO_KNOWN),
  });
}

function parseCoordinateSysParam(
  element: XmlElement | undefined,
): WaylineCoordinateSysParam | undefined {
  if (!element) return undefined;
  return compactObject({
    coordinateMode: childText(element, "coordinateMode"),
    heightMode: childText(element, "heightMode"),
    globalShootHeight: childNumber(element, "globalShootHeight"),
    positioningType: childText(element, "positioningType"),
    surfaceFollowModeEnable: childBoolean(element, "surfaceFollowModeEnable"),
    surfaceRelativeHeight: childNumber(element, "surfaceRelativeHeight"),
    extraElements: extraElements(element, COORD_SYS_KNOWN),
  });
}

function parseHeadingParam(
  element: XmlElement | undefined,
): WaypointHeadingParam | undefined {
  if (!element) return undefined;
  return compactObject({
    waypointHeadingMode: childText(element, "waypointHeadingMode"),
    waypointHeadingAngle: childNumber(element, "waypointHeadingAngle"),
    waypointPoiPoint: parseLatLonAltCoordinate(
      childText(element, "waypointPoiPoint"),
    ),
    waypointHeadingAngleEnable: childBoolean(
      element,
      "waypointHeadingAngleEnable",
    ),
    waypointHeadingPathMode: childText(element, "waypointHeadingPathMode"),
    waypointHeadingPoiIndex: childNumber(element, "waypointHeadingPoiIndex"),
    extraElements: extraElements(element, HEADING_KNOWN),
  });
}

function parseTurnParam(
  element: XmlElement | undefined,
): WaypointTurnParam | undefined {
  if (!element) return undefined;
  return compactObject({
    waypointTurnMode: childText(element, "waypointTurnMode"),
    waypointTurnDampingDist: childNumber(element, "waypointTurnDampingDist"),
    extraElements: extraElements(element, TURN_KNOWN),
  });
}

function parseGimbalHeadingParam(
  element: XmlElement | undefined,
): WaypointGimbalHeadingParam | undefined {
  if (!element) return undefined;
  return compactObject({
    waypointGimbalPitchAngle: childNumber(element, "waypointGimbalPitchAngle"),
    waypointGimbalYawAngle: childNumber(element, "waypointGimbalYawAngle"),
    extraElements: extraElements(element, GIMBAL_HEADING_KNOWN),
  });
}

function parseTemplateFolder(
  element: XmlElement | undefined,
): TemplateFolder | undefined {
  if (!element) return undefined;
  return compactObject({
    templateType: childText(element, "templateType"),
    templateId: childNumber(element, "templateId"),
    autoFlightSpeed: childNumber(element, "autoFlightSpeed"),
    waylineCoordinateSysParam: parseCoordinateSysParam(
      firstChildByLocalName(element, "waylineCoordinateSysParam"),
    ),
    gimbalPitchMode: childText(element, "gimbalPitchMode"),
    globalWaypointHeadingParam: parseHeadingParam(
      firstChildByLocalName(element, "globalWaypointHeadingParam"),
    ),
    globalWaypointTurnMode: childText(element, "globalWaypointTurnMode"),
    globalUseStraightLine: childBoolean(element, "globalUseStraightLine"),
    globalHeight: childNumber(element, "globalHeight"),
    waypoints: childrenByLocalName(element, "Placemark").map(
      parseTemplateWaypoint,
    ),
    extraElements: extraElements(element, TEMPLATE_FOLDER_KNOWN),
  }) as TemplateFolder;
}

function parseTemplateWaypoint(element: XmlElement): TemplateWaypoint {
  const coordinate = parsePlacemarkCoordinate(element) ?? {
    longitude: 0,
    latitude: 0,
  };
  return compactObject({
    index: childNumber(element, "index") ?? 0,
    coordinate,
    ellipsoidHeight: childNumber(element, "ellipsoidHeight"),
    height: childNumber(element, "height"),
    useGlobalHeight: childBoolean(element, "useGlobalHeight"),
    useGlobalSpeed: childBoolean(element, "useGlobalSpeed"),
    waypointSpeed: childNumber(element, "waypointSpeed"),
    useGlobalHeadingParam: childBoolean(element, "useGlobalHeadingParam"),
    waypointHeadingParam: parseHeadingParam(
      firstChildByLocalName(element, "waypointHeadingParam"),
    ),
    useGlobalTurnParam: childBoolean(element, "useGlobalTurnParam"),
    waypointTurnParam: parseTurnParam(
      firstChildByLocalName(element, "waypointTurnParam"),
    ),
    useStraightLine: childBoolean(element, "useStraightLine"),
    gimbalPitchAngle: childNumber(element, "gimbalPitchAngle"),
    actionGroups: childrenByLocalName(element, "actionGroup").map(
      parseActionGroup,
    ),
    extraElements: extraElements(element, TEMPLATE_WAYPOINT_KNOWN),
  }) as TemplateWaypoint;
}

function parseWaylineFolder(element: XmlElement): WaylineFolder {
  return compactObject({
    templateId: childNumber(element, "templateId"),
    executeHeightMode: childText(element, "executeHeightMode"),
    waylineId: childNumber(element, "waylineId"),
    distance: childNumber(element, "distance"),
    duration: childNumber(element, "duration"),
    autoFlightSpeed: childNumber(element, "autoFlightSpeed"),
    waylineCoordinateSysParam: parseCoordinateSysParam(
      firstChildByLocalName(element, "waylineCoordinateSysParam"),
    ),
    startActionGroups: childrenByLocalName(element, "startActionGroup").map(
      parseActionGroup,
    ),
    waypoints: childrenByLocalName(element, "Placemark").map(
      parseWaylineWaypoint,
    ),
    extraElements: extraElements(element, WAYLINE_FOLDER_KNOWN),
  }) as WaylineFolder;
}

function parseWaylineWaypoint(element: XmlElement): WpmzWaypoint {
  const coordinate = parsePlacemarkCoordinate(element) ?? {
    longitude: 0,
    latitude: 0,
  };
  return compactObject({
    index: childNumber(element, "index") ?? 0,
    coordinate,
    executeHeight: childNumber(element, "executeHeight"),
    waypointSpeed: childNumber(element, "waypointSpeed"),
    waypointHeadingParam: parseHeadingParam(
      firstChildByLocalName(element, "waypointHeadingParam"),
    ),
    waypointTurnParam: parseTurnParam(
      firstChildByLocalName(element, "waypointTurnParam"),
    ),
    useStraightLine: childBoolean(element, "useStraightLine"),
    actionGroups: childrenByLocalName(element, "actionGroup").map(
      parseActionGroup,
    ),
    waypointGimbalHeadingParam: parseGimbalHeadingParam(
      firstChildByLocalName(element, "waypointGimbalHeadingParam"),
    ),
    extraElements: extraElements(element, WAYPOINT_KNOWN),
  }) as WpmzWaypoint;
}

function parsePlacemarkCoordinate(
  placemark: XmlElement,
): Coordinate | undefined {
  const point = firstChildByLocalName(placemark, "Point");
  return parseCoordinate(childText(point, "coordinates"));
}

function parseActionGroup(element: XmlElement): ActionGroup {
  return compactObject({
    actionGroupId: childNumber(element, "actionGroupId"),
    actionGroupStartIndex: childNumber(element, "actionGroupStartIndex"),
    actionGroupEndIndex: childNumber(element, "actionGroupEndIndex"),
    actionGroupMode: childText(element, "actionGroupMode"),
    actionTrigger: parseActionTrigger(
      firstChildByLocalName(element, "actionTrigger"),
    ),
    actions: childrenByLocalName(element, "action").map(parseAction),
    extraElements: extraElements(element, ACTION_GROUP_KNOWN),
  }) as ActionGroup;
}

function parseActionTrigger(
  element: XmlElement | undefined,
): ActionTrigger | undefined {
  if (!element) return undefined;
  return compactObject({
    actionTriggerType: childText(element, "actionTriggerType"),
    actionTriggerParam: childNumber(element, "actionTriggerParam"),
    extraElements: extraElements(element, ACTION_TRIGGER_KNOWN),
  });
}

function parseAction(element: XmlElement): WpmzAction {
  const paramRoot = firstChildByLocalName(element, "actionActuatorFuncParam");
  const paramElements = paramRoot ? elementChildren(paramRoot) : [];
  const params: Record<string, string | number | boolean> = {};
  for (const param of paramElements) {
    const value = primitiveFromText(textContent(param));
    if (value !== undefined) params[localName(param.name)] = value;
  }

  return compactObject({
    actionId: childNumber(element, "actionId"),
    actionActuatorFunc: childText(element, "actionActuatorFunc") ?? "unknown",
    params,
    paramElements,
    extraElements: extraElements(element, ACTION_KNOWN),
  }) as WpmzAction;
}

function mergeMissionConfig(
  templateConfig: MissionConfig,
  waylinesConfig: MissionConfig,
): MissionConfig {
  const droneInfo = mergeNested(
    templateConfig.droneInfo,
    waylinesConfig.droneInfo,
  );
  const payloadInfo = mergeNested(
    templateConfig.payloadInfo,
    waylinesConfig.payloadInfo,
  );
  return compactObject({
    ...templateConfig,
    ...waylinesConfig,
    ...(droneInfo ? { droneInfo } : {}),
    ...(payloadInfo ? { payloadInfo } : {}),
    extraElements: [
      ...(templateConfig.extraElements ?? []),
      ...(waylinesConfig.extraElements ?? []),
    ],
  });
}

function mergeNested<T extends object>(
  a: T | undefined,
  b: T | undefined,
): T | undefined {
  if (!a) return b;
  if (!b) return a;
  return { ...a, ...b };
}
