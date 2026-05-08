import { nowForProfile, profileForDocument } from "./profiles.js";
import type {
  ActionGroup,
  ActionTrigger,
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
  WpmzProfile,
  XmlElement,
  XmlNode,
} from "./types.js";
import {
  formatCoordinate,
  formatLatLonAltCoordinate,
  formatNumber,
  makeElement,
  makeTextElement,
  serializeDocument,
} from "./xml.js";

export interface BuildOptions {
  readonly profile?: WpmzProfile;
  readonly pretty?: boolean;
  /** Use original uploaded files byte-for-byte when no mutation is requested. */
  readonly preferOriginal?: boolean;
}

export function buildWpmzFiles(
  document: WpmzDocument,
  options: BuildOptions = {},
): WpmzFiles {
  if (
    options.preferOriginal &&
    document.original?.templateKml &&
    document.original.waylinesWpml
  ) {
    return {
      templateKml: document.original.templateKml,
      waylinesWpml: document.original.waylinesWpml,
    };
  }
  const profile = profileForDocument(document, options.profile);
  return {
    templateKml: buildTemplateKml(document, { ...options, profile }),
    waylinesWpml: buildWaylinesWpml(document, { ...options, profile }),
  };
}

export function buildTemplateKml(
  document: WpmzDocument,
  options: BuildOptions = {},
): string {
  const profile = profileForDocument(document, options.profile);
  const pretty = options.pretty ?? true;
  const docChildren: XmlNode[] = [
    ...metadataElements(document, profile),
    missionConfigElement(document.missionConfig, profile),
  ];

  const templateFolder =
    document.templateFolder ?? synthesizeTemplateFolder(document);
  if (profile.templateStyle === "full-waypoint" && templateFolder) {
    docChildren.push(templateFolderElement(templateFolder));
  }

  return serializeDocument(
    kmlRoot(document, profile, [makeElement("Document", docChildren)]),
    pretty,
  );
}

export function buildWaylinesWpml(
  document: WpmzDocument,
  options: BuildOptions = {},
): string {
  const profile = profileForDocument(document, options.profile);
  const pretty = options.pretty ?? true;
  const waylines =
    document.waylines.length > 0
      ? document.waylines
      : [synthesizeWaylineFolder(document)];
  const docChildren: XmlNode[] = [
    missionConfigElement(document.missionConfig, profile),
  ];
  docChildren.push(
    ...waylines.map((wayline) => waylineFolderElement(wayline, profile)),
  );
  return serializeDocument(
    kmlRoot(document, profile, [makeElement("Document", docChildren)]),
    pretty,
  );
}

function kmlRoot(
  document: WpmzDocument,
  profile: WpmzProfile,
  children: readonly XmlNode[],
): XmlElement {
  return makeElement("kml", children, {
    xmlns: document.kmlNamespace || profile.kmlNamespace,
    "xmlns:wpml": profile.wpmlNamespace || document.wpmlNamespace,
  });
}

function metadataElements(
  document: WpmzDocument,
  profile: WpmzProfile,
): XmlNode[] {
  const metadata = document.metadata;
  const createTime = metadata.createTime ?? nowForProfile(profile);
  const updateTime = metadata.updateTime ?? createTime;
  return compactNodes([
    metadata.author !== undefined
      ? wpText("author", metadata.author)
      : undefined,
    wpText("createTime", createTime),
    wpText("updateTime", updateTime),
    ...(metadata.extraElements ?? []),
  ]);
}

function missionConfigElement(
  config: MissionConfig,
  profile: WpmzProfile,
): XmlElement {
  const includePayload =
    profile.includePayloadInfo === "always" ||
    (profile.includePayloadInfo === "when-present" && config.payloadInfo);
  const includeTakeoff =
    profile.includeTakeOffSecurityHeight === "always" ||
    (profile.includeTakeOffSecurityHeight === "when-present" &&
      config.takeOffSecurityHeight !== undefined);

  return makeElement(
    "wpml:missionConfig",
    compactNodes([
      textIfDefined("flyToWaylineMode", config.flyToWaylineMode),
      textIfDefined("finishAction", config.finishAction),
      textIfDefined("exitOnRCLost", config.exitOnRCLost),
      textIfDefined("executeRCLostAction", config.executeRCLostAction),
      includeTakeoff
        ? wpText("takeOffSecurityHeight", config.takeOffSecurityHeight ?? 20)
        : undefined,
      config.takeOffRefPoint
        ? wpText(
            "takeOffRefPoint",
            formatLatLonAltCoordinate(config.takeOffRefPoint),
          )
        : undefined,
      textIfDefined(
        "takeOffRefPointAGLHeight",
        config.takeOffRefPointAGLHeight,
      ),
      textIfDefined("globalTransitionalSpeed", config.globalTransitionalSpeed),
      config.droneInfo ? droneInfoElement(config.droneInfo) : undefined,
      includePayload && config.payloadInfo
        ? payloadInfoElement(config.payloadInfo)
        : undefined,
      ...(config.extraElements ?? []),
    ]),
  );
}

function droneInfoElement(info: DroneInfo): XmlElement {
  return makeElement(
    "wpml:droneInfo",
    compactNodes([
      textIfDefined("droneEnumValue", info.droneEnumValue),
      textIfDefined("droneSubEnumValue", info.droneSubEnumValue),
      ...(info.extraElements ?? []),
    ]),
  );
}

function payloadInfoElement(info: PayloadInfo): XmlElement {
  return makeElement(
    "wpml:payloadInfo",
    compactNodes([
      textIfDefined("payloadEnumValue", info.payloadEnumValue),
      textIfDefined("payloadPositionIndex", info.payloadPositionIndex),
      ...(info.extraElements ?? []),
    ]),
  );
}

function coordinateSysParamElement(
  param: WaylineCoordinateSysParam,
): XmlElement {
  return makeElement(
    "wpml:waylineCoordinateSysParam",
    compactNodes([
      textIfDefined("coordinateMode", param.coordinateMode),
      textIfDefined("heightMode", param.heightMode),
      textIfDefined("globalShootHeight", param.globalShootHeight),
      textIfDefined("positioningType", param.positioningType),
      boolIfDefined("surfaceFollowModeEnable", param.surfaceFollowModeEnable),
      textIfDefined("surfaceRelativeHeight", param.surfaceRelativeHeight),
      ...(param.extraElements ?? []),
    ]),
  );
}

function templateFolderElement(folder: TemplateFolder): XmlElement {
  return makeElement(
    "Folder",
    compactNodes([
      textIfDefined("templateType", folder.templateType),
      textIfDefined("templateId", folder.templateId),
      folder.waylineCoordinateSysParam
        ? coordinateSysParamElement(folder.waylineCoordinateSysParam)
        : undefined,
      textIfDefined("autoFlightSpeed", folder.autoFlightSpeed),
      textIfDefined("gimbalPitchMode", folder.gimbalPitchMode),
      folder.globalWaypointHeadingParam
        ? headingParamElement(
            "globalWaypointHeadingParam",
            folder.globalWaypointHeadingParam,
          )
        : undefined,
      textIfDefined("globalWaypointTurnMode", folder.globalWaypointTurnMode),
      boolIfDefined("globalUseStraightLine", folder.globalUseStraightLine),
      textIfDefined("globalHeight", folder.globalHeight),
      ...(folder.extraElements ?? []),
      ...folder.waypoints.map(templateWaypointElement),
    ]),
  );
}

function templateWaypointElement(waypoint: TemplateWaypoint): XmlElement {
  return makeElement(
    "Placemark",
    compactNodes([
      pointElement(waypoint.coordinate),
      wpText("index", waypoint.index),
      textIfDefined("ellipsoidHeight", waypoint.ellipsoidHeight),
      textIfDefined("height", waypoint.height),
      boolIfDefined("useGlobalHeight", waypoint.useGlobalHeight),
      boolIfDefined("useGlobalSpeed", waypoint.useGlobalSpeed),
      textIfDefined("waypointSpeed", waypoint.waypointSpeed),
      boolIfDefined("useGlobalHeadingParam", waypoint.useGlobalHeadingParam),
      waypoint.waypointHeadingParam
        ? headingParamElement(
            "waypointHeadingParam",
            waypoint.waypointHeadingParam,
          )
        : undefined,
      boolIfDefined("useGlobalTurnParam", waypoint.useGlobalTurnParam),
      waypoint.waypointTurnParam
        ? turnParamElement(waypoint.waypointTurnParam)
        : undefined,
      boolIfDefined("useStraightLine", waypoint.useStraightLine),
      textIfDefined("gimbalPitchAngle", waypoint.gimbalPitchAngle),
      ...(waypoint.extraElements ?? []),
      ...waypoint.actionGroups.map(actionGroupElement),
    ]),
  );
}

function waylineFolderElement(
  folder: WaylineFolder,
  profile: WpmzProfile,
): XmlElement {
  const includeDistance =
    profile.includeWaylineDistanceDuration === "always" ||
    (profile.includeWaylineDistanceDuration === "when-present" &&
      folder.distance !== undefined);
  const includeDuration =
    profile.includeWaylineDistanceDuration === "always" ||
    (profile.includeWaylineDistanceDuration === "when-present" &&
      folder.duration !== undefined);
  return makeElement(
    "Folder",
    compactNodes([
      textIfDefined("templateId", folder.templateId),
      profile.waylineHeightModeElement === "executeHeightMode"
        ? textIfDefined("executeHeightMode", folder.executeHeightMode)
        : undefined,
      textIfDefined("waylineId", folder.waylineId),
      includeDistance ? wpText("distance", folder.distance ?? 0) : undefined,
      includeDuration ? wpText("duration", folder.duration ?? 0) : undefined,
      textIfDefined("autoFlightSpeed", folder.autoFlightSpeed),
      profile.waylineHeightModeElement === "waylineCoordinateSysParam" &&
      folder.waylineCoordinateSysParam
        ? coordinateSysParamElement(folder.waylineCoordinateSysParam)
        : undefined,
      ...(folder.startActionGroups ?? []).map((group) =>
        withName(actionGroupElement(group), "wpml:startActionGroup"),
      ),
      ...(folder.extraElements ?? []),
      ...folder.waypoints.map(waylineWaypointElement),
    ]),
  );
}

function waylineWaypointElement(
  waypoint: WaylineFolder["waypoints"][number],
): XmlElement {
  return makeElement(
    "Placemark",
    compactNodes([
      pointElement(waypoint.coordinate),
      wpText("index", waypoint.index),
      textIfDefined("executeHeight", waypoint.executeHeight),
      textIfDefined("waypointSpeed", waypoint.waypointSpeed),
      waypoint.waypointHeadingParam
        ? headingParamElement(
            "waypointHeadingParam",
            waypoint.waypointHeadingParam,
          )
        : undefined,
      waypoint.waypointTurnParam
        ? turnParamElement(waypoint.waypointTurnParam)
        : undefined,
      boolIfDefined("useStraightLine", waypoint.useStraightLine),
      ...(waypoint.extraElements ?? []),
      ...waypoint.actionGroups.map(actionGroupElement),
      waypoint.waypointGimbalHeadingParam
        ? gimbalHeadingParamElement(waypoint.waypointGimbalHeadingParam)
        : undefined,
    ]),
  );
}

function pointElement(coordinate: {
  readonly longitude: number;
  readonly latitude: number;
  readonly altitude?: number;
}): XmlElement {
  return makeElement("Point", [
    makeTextElement(
      "coordinates",
      formatCoordinate(coordinate, coordinate.altitude !== undefined),
    ),
  ]);
}

function headingParamElement(
  localTagName: "waypointHeadingParam" | "globalWaypointHeadingParam",
  param: WaypointHeadingParam,
): XmlElement {
  return makeElement(
    `wpml:${localTagName}`,
    compactNodes([
      textIfDefined("waypointHeadingMode", param.waypointHeadingMode),
      textIfDefined("waypointHeadingAngle", param.waypointHeadingAngle),
      param.waypointPoiPoint
        ? wpText(
            "waypointPoiPoint",
            formatLatLonAltCoordinate(param.waypointPoiPoint),
          )
        : undefined,
      boolIfDefined(
        "waypointHeadingAngleEnable",
        param.waypointHeadingAngleEnable,
      ),
      textIfDefined("waypointHeadingPathMode", param.waypointHeadingPathMode),
      textIfDefined("waypointHeadingPoiIndex", param.waypointHeadingPoiIndex),
      ...(param.extraElements ?? []),
    ]),
  );
}

function turnParamElement(param: WaypointTurnParam): XmlElement {
  return makeElement(
    "wpml:waypointTurnParam",
    compactNodes([
      textIfDefined("waypointTurnMode", param.waypointTurnMode),
      textIfDefined("waypointTurnDampingDist", param.waypointTurnDampingDist),
      ...(param.extraElements ?? []),
    ]),
  );
}

function gimbalHeadingParamElement(
  param: WaypointGimbalHeadingParam,
): XmlElement {
  return makeElement(
    "wpml:waypointGimbalHeadingParam",
    compactNodes([
      textIfDefined("waypointGimbalPitchAngle", param.waypointGimbalPitchAngle),
      textIfDefined("waypointGimbalYawAngle", param.waypointGimbalYawAngle),
      ...(param.extraElements ?? []),
    ]),
  );
}

function actionGroupElement(group: ActionGroup): XmlElement {
  return makeElement(
    "wpml:actionGroup",
    compactNodes([
      textIfDefined("actionGroupId", group.actionGroupId),
      textIfDefined("actionGroupStartIndex", group.actionGroupStartIndex),
      textIfDefined("actionGroupEndIndex", group.actionGroupEndIndex),
      textIfDefined("actionGroupMode", group.actionGroupMode),
      group.actionTrigger
        ? actionTriggerElement(group.actionTrigger)
        : undefined,
      ...(group.extraElements ?? []),
      ...group.actions.map(actionElement),
    ]),
  );
}

function actionTriggerElement(trigger: ActionTrigger): XmlElement {
  return makeElement(
    "wpml:actionTrigger",
    compactNodes([
      textIfDefined("actionTriggerType", trigger.actionTriggerType),
      textIfDefined("actionTriggerParam", trigger.actionTriggerParam),
      ...(trigger.extraElements ?? []),
    ]),
  );
}

function actionElement(action: WpmzAction): XmlElement {
  return makeElement(
    "wpml:action",
    compactNodes([
      textIfDefined("actionId", action.actionId),
      wpText("actionActuatorFunc", action.actionActuatorFunc),
      makeElement("wpml:actionActuatorFuncParam", actionParamElements(action)),
      ...(action.extraElements ?? []),
    ]),
  );
}

function actionParamElements(action: WpmzAction): readonly XmlNode[] {
  if (action.paramElements && action.paramElements.length > 0)
    return action.paramElements;
  return Object.entries(action.params).map(([key, value]) =>
    wpText(key, value),
  );
}

function textIfDefined(
  localTagName: string,
  value: string | number | undefined,
): XmlElement | undefined {
  if (value === undefined) return undefined;
  return wpText(
    localTagName,
    typeof value === "number" ? formatNumber(value) : value,
  );
}

function boolIfDefined(
  localTagName: string,
  value: boolean | undefined,
): XmlElement | undefined {
  if (value === undefined) return undefined;
  return wpText(localTagName, value ? 1 : 0);
}

function wpText(
  localTagName: string,
  value: string | number | boolean,
): XmlElement {
  return makeTextElement(`wpml:${localTagName}`, value);
}

function withName(element: XmlElement, name: string): XmlElement {
  return makeElement(name, element.children, element.attributes);
}

function compactNodes(nodes: readonly (XmlNode | undefined)[]): XmlNode[] {
  return nodes.filter((node): node is XmlNode => node !== undefined);
}

function synthesizeWaylineFolder(document: WpmzDocument): WaylineFolder {
  const folder = document.templateFolder;
  const waypoints = (folder?.waypoints ?? []).map((waypoint) => ({
    index: waypoint.index,
    coordinate: waypoint.coordinate,
    executeHeight:
      waypoint.height ?? waypoint.ellipsoidHeight ?? folder?.globalHeight,
    waypointSpeed: waypoint.waypointSpeed ?? folder?.autoFlightSpeed,
    waypointHeadingParam:
      waypoint.waypointHeadingParam ?? folder?.globalWaypointHeadingParam,
    waypointTurnParam:
      waypoint.waypointTurnParam ??
      (folder?.globalWaypointTurnMode
        ? {
            waypointTurnMode: folder.globalWaypointTurnMode,
            waypointTurnDampingDist: 0,
          }
        : undefined),
    useStraightLine: waypoint.useStraightLine ?? folder?.globalUseStraightLine,
    actionGroups: waypoint.actionGroups,
  }));
  return {
    templateId: folder?.templateId ?? 0,
    executeHeightMode:
      folder?.waylineCoordinateSysParam?.heightMode ?? "relativeToStartPoint",
    waylineId: 0,
    distance: 0,
    duration: 0,
    autoFlightSpeed:
      folder?.autoFlightSpeed ?? document.missionConfig.globalTransitionalSpeed,
    waylineCoordinateSysParam: folder?.waylineCoordinateSysParam,
    waypoints,
  };
}

function synthesizeTemplateFolder(
  document: WpmzDocument,
): TemplateFolder | undefined {
  const firstWayline = document.waylines[0];
  if (!firstWayline) return undefined;
  return {
    templateType: "waypoint",
    templateId: firstWayline.templateId ?? 0,
    autoFlightSpeed: firstWayline.autoFlightSpeed,
    waylineCoordinateSysParam: firstWayline.waylineCoordinateSysParam ?? {
      coordinateMode: "WGS84",
      heightMode: firstWayline.executeHeightMode,
    },
    gimbalPitchMode: "usePointSetting",
    globalWaypointTurnMode:
      firstWayline.waypoints[0]?.waypointTurnParam?.waypointTurnMode,
    globalUseStraightLine: firstWayline.waypoints[0]?.useStraightLine,
    waypoints: firstWayline.waypoints.map((waypoint) => ({
      index: waypoint.index,
      coordinate: waypoint.coordinate,
      ellipsoidHeight: waypoint.executeHeight,
      height: waypoint.executeHeight,
      useGlobalHeight: false,
      useGlobalSpeed: false,
      waypointSpeed: waypoint.waypointSpeed,
      useGlobalHeadingParam: false,
      waypointHeadingParam: waypoint.waypointHeadingParam,
      useGlobalTurnParam: false,
      waypointTurnParam: waypoint.waypointTurnParam,
      useStraightLine: waypoint.useStraightLine,
      gimbalPitchAngle:
        waypoint.waypointGimbalHeadingParam?.waypointGimbalPitchAngle,
      actionGroups: waypoint.actionGroups,
    })),
  };
}
