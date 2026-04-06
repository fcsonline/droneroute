import type { Mission, MissionConfig, Waypoint, WaypointAction, PointOfInterest } from "@droneroute/shared";

// ── XML Helpers ──────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Compute bearing (degrees, 0=N, CW) from point A to point B */
function computeBearing(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return ((toDeg(Math.atan2(y, x)) % 360) + 360) % 360;
}

function findPoi(pois: PointOfInterest[], id?: string): PointOfInterest | undefined {
  if (!id) return undefined;
  return pois.find((p) => p.id === id);
}

// ── Action XML ───────────────────────────────────────────

function buildActionXml(action: WaypointAction): string {
  let paramsXml = "";

  switch (action.actionType) {
    case "takePhoto":
      paramsXml = `
              <wpml:payloadPositionIndex>${(action.params as any).payloadPositionIndex ?? 0}</wpml:payloadPositionIndex>
              <wpml:fileSuffix>${escapeXml((action.params as any).fileSuffix || "")}</wpml:fileSuffix>`;
      break;
    case "startRecord":
      paramsXml = `
              <wpml:payloadPositionIndex>${(action.params as any).payloadPositionIndex ?? 0}</wpml:payloadPositionIndex>
              <wpml:fileSuffix>${escapeXml((action.params as any).fileSuffix || "")}</wpml:fileSuffix>`;
      break;
    case "stopRecord":
      paramsXml = `
              <wpml:payloadPositionIndex>${(action.params as any).payloadPositionIndex ?? 0}</wpml:payloadPositionIndex>`;
      break;
    case "gimbalRotate": {
      const p = action.params as any;
      paramsXml = `
              <wpml:gimbalHeadingYawBase>north</wpml:gimbalHeadingYawBase>
              <wpml:gimbalRotateMode>${p.gimbalRotateMode || "absoluteAngle"}</wpml:gimbalRotateMode>
              <wpml:gimbalPitchRotateEnable>1</wpml:gimbalPitchRotateEnable>
              <wpml:gimbalPitchRotateAngle>${p.gimbalPitchRotateAngle ?? 0}</wpml:gimbalPitchRotateAngle>
              <wpml:gimbalRollRotateEnable>0</wpml:gimbalRollRotateEnable>
              <wpml:gimbalRollRotateAngle>${p.gimbalRollRotateAngle ?? 0}</wpml:gimbalRollRotateAngle>
              <wpml:gimbalYawRotateEnable>1</wpml:gimbalYawRotateEnable>
              <wpml:gimbalYawRotateAngle>${p.gimbalYawRotateAngle ?? 0}</wpml:gimbalYawRotateAngle>
              <wpml:gimbalRotateTimeEnable>0</wpml:gimbalRotateTimeEnable>
              <wpml:gimbalRotateTime>0</wpml:gimbalRotateTime>
              <wpml:payloadPositionIndex>${p.payloadPositionIndex ?? 0}</wpml:payloadPositionIndex>`;
      break;
    }
    case "gimbalEvenlyRotate": {
      const p = action.params as any;
      paramsXml = `
              <wpml:gimbalPitchRotateAngle>${p.gimbalPitchRotateAngle ?? -45}</wpml:gimbalPitchRotateAngle>
              <wpml:payloadPositionIndex>${p.payloadPositionIndex ?? 0}</wpml:payloadPositionIndex>`;
      break;
    }
    case "rotateYaw": {
      const p = action.params as any;
      paramsXml = `
              <wpml:aircraftHeading>${p.aircraftHeading ?? 0}</wpml:aircraftHeading>
              <wpml:aircraftPathMode>${p.aircraftPathMode || "clockwise"}</wpml:aircraftPathMode>`;
      break;
    }
    case "hover":
      paramsXml = `
              <wpml:hoverTime>${(action.params as any).hoverTime ?? 5}</wpml:hoverTime>`;
      break;
    case "zoom":
      paramsXml = `
              <wpml:focalLength>${(action.params as any).focalLength ?? 24}</wpml:focalLength>`;
      break;
    case "focus": {
      const p = action.params as any;
      paramsXml = `
              <wpml:isPointFocus>${p.isPointFocus ? 1 : 0}</wpml:isPointFocus>
              <wpml:focusX>${p.focusX ?? 0.5}</wpml:focusX>
              <wpml:focusY>${p.focusY ?? 0.5}</wpml:focusY>
              <wpml:isInfiniteFocus>${p.isInfiniteFocus ? 1 : 0}</wpml:isInfiniteFocus>`;
      break;
    }
  }

  return `
          <wpml:action>
            <wpml:actionId>${action.actionId}</wpml:actionId>
            <wpml:actionActuatorFunc>${action.actionType}</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>${paramsXml}
            </wpml:actionActuatorFuncParam>
          </wpml:action>`;
}

function buildActionGroupXml(wp: Waypoint, groupIdOffset: number): string {
  if (wp.actions.length === 0) return "";

  const actionsXml = wp.actions.map(buildActionXml).join("");

  return `
        <wpml:actionGroup>
          <wpml:actionGroupId>${groupIdOffset}</wpml:actionGroupId>
          <wpml:actionGroupStartIndex>${wp.index}</wpml:actionGroupStartIndex>
          <wpml:actionGroupEndIndex>${wp.index}</wpml:actionGroupEndIndex>
          <wpml:actionGroupMode>sequence</wpml:actionGroupMode>
          <wpml:actionTrigger>
            <wpml:actionTriggerType>reachPoint</wpml:actionTriggerType>
          </wpml:actionTrigger>${actionsXml}
        </wpml:actionGroup>`;
}

// ── Template KML ─────────────────────────────────────────

export function buildTemplateKml(mission: Mission): string {
  const c = mission.config;
  const pois = mission.pois || [];
  const now = Date.now();

  const placemarks = mission.waypoints
    .map((wp, i) => {
      const actionGroupXml = buildActionGroupXml(wp, i);

      // Build per-waypoint heading param when using towardPOI
      let headingOverrideXml = "";
      if (!wp.useGlobalHeadingParam && wp.headingMode === "towardPOI" && wp.poiId) {
        const poi = findPoi(pois, wp.poiId);
        if (poi) {
          headingOverrideXml = `
        <wpml:waypointHeadingParam>
          <wpml:waypointHeadingMode>towardPOI</wpml:waypointHeadingMode>
          <wpml:waypointPoiPoint>${poi.longitude},${poi.latitude},${poi.height}</wpml:waypointPoiPoint>
          <wpml:waypointHeadingPathMode>clockwise</wpml:waypointHeadingPathMode>
        </wpml:waypointHeadingParam>`;
        }
      }

      return `
      <Placemark>
        <Point>
          <coordinates>${wp.longitude},${wp.latitude}</coordinates>
        </Point>
        <wpml:index>${wp.index}</wpml:index>
        <wpml:ellipsoidHeight>${wp.height}</wpml:ellipsoidHeight>
        <wpml:height>${wp.height}</wpml:height>
        <wpml:useGlobalHeight>${wp.useGlobalHeight ? 1 : 0}</wpml:useGlobalHeight>
        <wpml:useGlobalSpeed>${wp.useGlobalSpeed ? 1 : 0}</wpml:useGlobalSpeed>
        ${!wp.useGlobalSpeed ? `<wpml:waypointSpeed>${wp.speed}</wpml:waypointSpeed>` : ""}
        <wpml:useGlobalHeadingParam>${wp.useGlobalHeadingParam ? 1 : 0}</wpml:useGlobalHeadingParam>
        <wpml:useGlobalTurnParam>${wp.useGlobalTurnParam ? 1 : 0}</wpml:useGlobalTurnParam>
        <wpml:gimbalPitchAngle>${wp.gimbalPitchAngle}</wpml:gimbalPitchAngle>${headingOverrideXml}${actionGroupXml}
      </Placemark>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"
     xmlns:wpml="http://www.dji.com/wpmz/1.0.2">
<Document>
  <wpml:createTime>${now}</wpml:createTime>
  <wpml:updateTime>${now}</wpml:updateTime>
  <wpml:missionConfig>
    <wpml:flyToWaylineMode>${c.flyToWaylineMode}</wpml:flyToWaylineMode>
    <wpml:finishAction>${c.finishAction}</wpml:finishAction>
    <wpml:exitOnRCLost>${c.exitOnRCLost}</wpml:exitOnRCLost>
    <wpml:executeRCLostAction>${c.executeRCLostAction}</wpml:executeRCLostAction>
    <wpml:takeOffSecurityHeight>${c.takeOffSecurityHeight}</wpml:takeOffSecurityHeight>
    <wpml:globalTransitionalSpeed>${c.globalTransitionalSpeed}</wpml:globalTransitionalSpeed>
    <wpml:droneInfo>
      <wpml:droneEnumValue>${c.droneEnumValue}</wpml:droneEnumValue>
      <wpml:droneSubEnumValue>${c.droneSubEnumValue}</wpml:droneSubEnumValue>
    </wpml:droneInfo>
    <wpml:payloadInfo>
      <wpml:payloadEnumValue>${c.payloadEnumValue}</wpml:payloadEnumValue>
      <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
    </wpml:payloadInfo>
  </wpml:missionConfig>
  <Folder>
    <wpml:templateType>waypoint</wpml:templateType>
    <wpml:templateId>0</wpml:templateId>
    <wpml:autoFlightSpeed>${c.autoFlightSpeed}</wpml:autoFlightSpeed>
    <wpml:waylineCoordinateSysParam>
      <wpml:coordinateMode>WGS84</wpml:coordinateMode>
      <wpml:heightMode>${c.heightMode}</wpml:heightMode>
    </wpml:waylineCoordinateSysParam>
    <wpml:gimbalPitchMode>${c.gimbalPitchMode}</wpml:gimbalPitchMode>
    <wpml:globalWaypointHeadingParam>
      <wpml:waypointHeadingMode>${c.globalHeadingMode}</wpml:waypointHeadingMode>
      <wpml:waypointHeadingPathMode>followBadArc</wpml:waypointHeadingPathMode>
    </wpml:globalWaypointHeadingParam>
    <wpml:globalWaypointTurnMode>${c.globalTurnMode}</wpml:globalWaypointTurnMode>${placemarks}
  </Folder>
</Document>
</kml>`;
}

// ── Waylines WPML ────────────────────────────────────────

export function buildWaylinesWpml(mission: Mission): string {
  const c = mission.config;
  const pois = mission.pois || [];
  const now = Date.now();

  const placemarks = mission.waypoints
    .map((wp, i) => {
      const actionGroupXml = buildActionGroupXml(wp, i);
      const headingMode = wp.useGlobalHeadingParam
        ? c.globalHeadingMode
        : (wp.headingMode || c.globalHeadingMode);
      const turnMode = wp.useGlobalTurnParam
        ? c.globalTurnMode
        : (wp.turnMode || c.globalTurnMode);
      const speed = wp.useGlobalSpeed ? c.autoFlightSpeed : wp.speed;

      // POI pointing: compute bearing or emit POI coordinates
      let poiXml = "";
      let headingAngle = wp.headingAngle ?? 0;
      if (headingMode === "towardPOI" && wp.poiId) {
        const poi = findPoi(pois, wp.poiId);
        if (poi) {
          headingAngle = computeBearing(wp.latitude, wp.longitude, poi.latitude, poi.longitude);
          poiXml = `
          <wpml:waypointPoiPoint>${poi.longitude},${poi.latitude},${poi.height}</wpml:waypointPoiPoint>`;
        }
      }

      return `
      <Placemark>
        <Point>
          <coordinates>${wp.longitude},${wp.latitude}</coordinates>
        </Point>
        <wpml:index>${wp.index}</wpml:index>
        <wpml:executeHeight>${wp.height}</wpml:executeHeight>
        <wpml:waypointSpeed>${speed}</wpml:waypointSpeed>
        <wpml:waypointHeadingParam>
          <wpml:waypointHeadingMode>${headingMode}</wpml:waypointHeadingMode>
          <wpml:waypointHeadingAngle>${headingAngle}</wpml:waypointHeadingAngle>
          <wpml:waypointHeadingPathMode>followBadArc</wpml:waypointHeadingPathMode>${poiXml}
        </wpml:waypointHeadingParam>
        <wpml:waypointTurnParam>
          <wpml:waypointTurnMode>${turnMode}</wpml:waypointTurnMode>
          <wpml:waypointTurnDampingDist>${wp.turnDampingDist ?? 0}</wpml:waypointTurnDampingDist>
        </wpml:waypointTurnParam>
        <wpml:gimbalPitchAngle>${wp.gimbalPitchAngle}</wpml:gimbalPitchAngle>${actionGroupXml}
      </Placemark>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"
     xmlns:wpml="http://www.dji.com/wpmz/1.0.2">
<Document>
  <wpml:createTime>${now}</wpml:createTime>
  <wpml:updateTime>${now}</wpml:updateTime>
  <wpml:missionConfig>
    <wpml:flyToWaylineMode>${c.flyToWaylineMode}</wpml:flyToWaylineMode>
    <wpml:finishAction>${c.finishAction}</wpml:finishAction>
    <wpml:exitOnRCLost>${c.exitOnRCLost}</wpml:exitOnRCLost>
    <wpml:executeRCLostAction>${c.executeRCLostAction}</wpml:executeRCLostAction>
    <wpml:takeOffSecurityHeight>${c.takeOffSecurityHeight}</wpml:takeOffSecurityHeight>
    <wpml:globalTransitionalSpeed>${c.globalTransitionalSpeed}</wpml:globalTransitionalSpeed>
    <wpml:droneInfo>
      <wpml:droneEnumValue>${c.droneEnumValue}</wpml:droneEnumValue>
      <wpml:droneSubEnumValue>${c.droneSubEnumValue}</wpml:droneSubEnumValue>
    </wpml:droneInfo>
    <wpml:payloadInfo>
      <wpml:payloadEnumValue>${c.payloadEnumValue}</wpml:payloadEnumValue>
      <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
    </wpml:payloadInfo>
  </wpml:missionConfig>
  <Folder>
    <wpml:templateId>0</wpml:templateId>
    <wpml:waylineId>0</wpml:waylineId>
    <wpml:autoFlightSpeed>${c.autoFlightSpeed}</wpml:autoFlightSpeed>
    <wpml:waylineCoordinateSysParam>
      <wpml:coordinateMode>WGS84</wpml:coordinateMode>
      <wpml:heightMode>${c.heightMode}</wpml:heightMode>
    </wpml:waylineCoordinateSysParam>${placemarks}
  </Folder>
</Document>
</kml>`;
}
