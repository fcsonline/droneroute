import type { Mission } from "@droneroute/shared";
import {
  DJI_FLY_UAV_PROFILE,
  buildWpmzKmz,
  fromDroneRouteMission,
  type DroneRouteMissionLike,
} from "@droneroute/dji-wpmz-universal";

export async function generateKmzBuffer(mission: Mission): Promise<Buffer> {
  const document = fromDroneRouteMission(
    mission as unknown as DroneRouteMissionLike,
    DJI_FLY_UAV_PROFILE,
  );
  return Buffer.from(buildWpmzKmz(document, { profile: DJI_FLY_UAV_PROFILE }));
}
