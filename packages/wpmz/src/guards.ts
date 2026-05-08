import type {
  ActionFunc,
  ActionGroup,
  ActionTriggerType,
  HeadingMode,
  TurnMode,
  WpmzAction,
  WpmzWaypoint,
} from "./types.js";

export function isActionFunc<T extends ActionFunc>(
  action: WpmzAction,
  func: T,
): action is WpmzAction & { readonly actionActuatorFunc: T } {
  return action.actionActuatorFunc === func;
}

export function isTriggerType<T extends ActionTriggerType>(
  group: ActionGroup,
  triggerType: T,
): group is ActionGroup & {
  readonly actionTrigger: NonNullable<ActionGroup["actionTrigger"]> & {
    readonly actionTriggerType: T;
  };
} {
  return group.actionTrigger?.actionTriggerType === triggerType;
}

export function isHeadingMode<T extends HeadingMode>(
  waypoint: WpmzWaypoint,
  mode: T,
): waypoint is WpmzWaypoint & {
  readonly waypointHeadingParam: NonNullable<
    WpmzWaypoint["waypointHeadingParam"]
  > & { readonly waypointHeadingMode: T };
} {
  return waypoint.waypointHeadingParam?.waypointHeadingMode === mode;
}

export function isTurnMode<T extends TurnMode>(
  waypoint: WpmzWaypoint,
  mode: T,
): waypoint is WpmzWaypoint & {
  readonly waypointTurnParam: NonNullable<WpmzWaypoint["waypointTurnParam"]> & {
    readonly waypointTurnMode: T;
  };
} {
  return waypoint.waypointTurnParam?.waypointTurnMode === mode;
}

export function numberParam(
  action: WpmzAction,
  key: string,
): number | undefined {
  const value = action.params[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

export function stringParam(
  action: WpmzAction,
  key: string,
): string | undefined {
  const value = action.params[key];
  return typeof value === "string" ? value : undefined;
}

export function booleanParam(
  action: WpmzAction,
  key: string,
): boolean | undefined {
  const value = action.params[key];
  return typeof value === "boolean" ? value : undefined;
}
