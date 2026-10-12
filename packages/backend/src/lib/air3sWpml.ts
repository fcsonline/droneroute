import type { Mission, Waypoint, WaypointAction } from "@droneroute/shared";
import { buildActionXml, computeBearing } from "./wpml.js";

// DJI Fly dialect observed in the Air 3S reference, distinct from Pilot 2 WPML.
const NAMESPACE = "http://www.uav.com/wpmz/1.0.2";

function documentXml(mission: Mission, folder = ""): string {
  const c = mission.config;
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="${NAMESPACE}">
  <Document>
    <wpml:missionConfig>
      <wpml:flyToWaylineMode>${c.flyToWaylineMode}</wpml:flyToWaylineMode>
      <wpml:finishAction>${c.finishAction}</wpml:finishAction>
      <wpml:exitOnRCLost>${c.exitOnRCLost}</wpml:exitOnRCLost>
      <wpml:executeRCLostAction>${c.executeRCLostAction}</wpml:executeRCLostAction>
      <wpml:globalTransitionalSpeed>${c.globalTransitionalSpeed}</wpml:globalTransitionalSpeed>
      <wpml:droneInfo>
        <wpml:droneEnumValue>68</wpml:droneEnumValue>
        <wpml:droneSubEnumValue>0</wpml:droneSubEnumValue>
      </wpml:droneInfo>
    </wpml:missionConfig>${folder}
  </Document>
</kml>`;
}

function pitchAction(pitch: number): WaypointAction {
  return {
    actionId: 0,
    actionType: "gimbalRotate",
    params: {
      gimbalPitchRotateAngle: pitch,
      gimbalYawRotateAngle: 0,
      gimbalRollRotateAngle: 0,
      gimbalRotateMode: "absoluteAngle",
      payloadPositionIndex: 0,
    },
  };
}

/** Keep imported segment actions on their original segments, never flatten them. */
function actionGroups(mission: Mission, wp: Waypoint) {
  type Group = {
    metadata: NonNullable<WaypointAction["group"]>;
    actions: WaypointAction[];
  };
  const groups: Group[] = [];
  const pointActions: WaypointAction[] = [];
  // The editor's pitch field is otherwise not an executable gimbal instruction.
  // Sequence it before camera actions on new facade missions.
  if (
    mission.config.gimbalPitchMode !== "manual" &&
    !wp.actions.some((a) => a.actionType === "gimbalRotate")
  ) {
    pointActions.push(pitchAction(wp.gimbalPitchAngle));
  }
  for (const action of wp.actions) {
    if (action.group) {
      let group = groups.find((g) => g.metadata.id === action.group!.id);
      if (!group) {
        group = { metadata: action.group, actions: [] };
        groups.push(group);
      }
      group.actions.push(action);
    } else if (action.actionType === "gimbalEvenlyRotate") {
      groups.push({
        metadata: {
          id: -1,
          startIndex: wp.index,
          endIndex: wp.index + 1,
          mode: "parallel",
          triggerType: "reachPoint",
        },
        actions: [action],
      });
    } else {
      pointActions.push(action);
    }
  }
  if (pointActions.length)
    groups.unshift({
      metadata: {
        id: -1,
        startIndex: wp.index,
        endIndex: wp.index,
        mode: "sequence",
        triggerType: "reachPoint",
      },
      actions: pointActions,
    });
  return groups;
}

export function buildAir3sTemplate(mission: Mission): string {
  // DJI Fly stores the executable route in waylines.wpml, not in template.kml.
  return documentXml(mission);
}

export function buildAir3sWaylines(mission: Mission): string {
  let groupId = 0;
  const c = mission.config;
  const placemarks = mission.waypoints
    .map((wp) => {
      const mode = wp.useGlobalHeadingParam
        ? c.globalHeadingMode
        : (wp.headingMode ?? c.globalHeadingMode);
      // WPML "fixed" holds the previous yaw; it does not set the requested angle.
      // DJI Fly's custom heading uses smoothTransition + an enabled angle.
      const headingMode =
        mode === "fixed" || mode === "towardPOI" ? "smoothTransition" : mode;
      let angle = wp.headingAngle ?? 0;
      if (mode === "towardPOI") {
        const poi = mission.pois.find((p) => p.id === wp.poiId)!;
        const bearing = computeBearing(
          wp.latitude,
          wp.longitude,
          poi.latitude,
          poi.longitude,
        );
        angle = bearing > 180 ? bearing - 360 : bearing;
      }
      const angleEnabled =
        mode === "fixed" || mode === "towardPOI"
          ? true
          : (wp.headingAngleEnable ?? mode === "smoothTransition");
      const turnMode = wp.useGlobalTurnParam
        ? c.globalTurnMode
        : (wp.turnMode ?? c.globalTurnMode);
      const actions = actionGroups(mission, wp)
        .map(
          ({ metadata: g, actions }) => `
        <wpml:actionGroup>
          <wpml:actionGroupId>${groupId++}</wpml:actionGroupId>
          <wpml:actionGroupStartIndex>${g.startIndex}</wpml:actionGroupStartIndex>
          <wpml:actionGroupEndIndex>${g.endIndex}</wpml:actionGroupEndIndex>
          <wpml:actionGroupMode>${g.mode}</wpml:actionGroupMode>
          <wpml:actionTrigger>
            <wpml:actionTriggerType>${g.triggerType}</wpml:actionTriggerType>${g.triggerParam === undefined ? "" : `<wpml:actionTriggerParam>${g.triggerParam}</wpml:actionTriggerParam>`}
          </wpml:actionTrigger>${actions.map((a, i) => buildActionXml({ ...a, actionId: i }, true)).join("")}
        </wpml:actionGroup>`,
        )
        .join("");
      return `
      <Placemark>
        <Point><coordinates>${wp.longitude},${wp.latitude}</coordinates></Point>
        <wpml:index>${wp.index}</wpml:index>
        <wpml:executeHeight>${wp.height}</wpml:executeHeight>
        <wpml:waypointSpeed>${wp.useGlobalSpeed ? c.autoFlightSpeed : wp.speed}</wpml:waypointSpeed>
        <wpml:waypointHeadingParam>
          <wpml:waypointHeadingMode>${headingMode}</wpml:waypointHeadingMode>
          <wpml:waypointHeadingAngle>${angle}</wpml:waypointHeadingAngle>
          <wpml:waypointPoiPoint>0.000000,0.000000,0.000000</wpml:waypointPoiPoint>
          <wpml:waypointHeadingAngleEnable>${angleEnabled ? 1 : 0}</wpml:waypointHeadingAngleEnable>
          <wpml:waypointHeadingPathMode>followBadArc</wpml:waypointHeadingPathMode>
          <wpml:waypointHeadingPoiIndex>0</wpml:waypointHeadingPoiIndex>
        </wpml:waypointHeadingParam>
        <wpml:waypointTurnParam>
          <wpml:waypointTurnMode>${turnMode === "toPointAndStopWithDiscontinuityCurvature" ? "toPointAndStopWithContinuityCurvature" : turnMode}</wpml:waypointTurnMode>
          <wpml:waypointTurnDampingDist>${wp.turnDampingDist ?? 0}</wpml:waypointTurnDampingDist>
        </wpml:waypointTurnParam>
        <wpml:useStraightLine>${wp.useStraightLine ? 1 : 0}</wpml:useStraightLine>${actions}
        <wpml:waypointGimbalHeadingParam>
          <wpml:waypointGimbalPitchAngle>0</wpml:waypointGimbalPitchAngle>
          <wpml:waypointGimbalYawAngle>0</wpml:waypointGimbalYawAngle>
        </wpml:waypointGimbalHeadingParam>
      </Placemark>`;
    })
    .join("");
  return documentXml(
    mission,
    `
    <Folder>
      <wpml:templateId>0</wpml:templateId>
      <wpml:executeHeightMode>relativeToStartPoint</wpml:executeHeightMode>
      <wpml:waylineId>0</wpml:waylineId>
      <wpml:autoFlightSpeed>${c.autoFlightSpeed}</wpml:autoFlightSpeed>${placemarks}
    </Folder>`,
  );
}
