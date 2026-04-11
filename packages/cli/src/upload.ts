import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { adbMkdir, adbPush } from "./adb.js";
import { ADB_WAYPOINT_PATH, KMZ_EXTENSION } from "./constants.js";
import type { DjiDevice } from "./device.js";

export interface UploadResult {
  uuid: string;
  remotePath: string;
}

/**
 * Upload a KMZ file to the selected DJI controller.
 *
 * Creates a new UUID-named mission folder and places the KMZ file
 * inside it with the matching UUID filename, so DJI Fly picks it up
 * as a new mission.
 */
export function uploadKmz(device: DjiDevice, kmzPath: string): UploadResult {
  const uuid = randomUUID().toUpperCase();
  const filename = `${uuid}${KMZ_EXTENSION}`;

  if (device.type === "mounted") {
    const dir = path.join(device.waypointPath!, uuid);
    const dest = path.join(dir, filename);

    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(kmzPath, dest);

    return {
      uuid,
      remotePath: dest,
    };
  }

  // adb device
  const remoteDir = `${ADB_WAYPOINT_PATH}/${uuid}`;
  const remoteDest = `${remoteDir}/${filename}`;

  adbMkdir(device.serial!, remoteDir);
  adbPush(device.serial!, kmzPath, remoteDest);

  return {
    uuid,
    remotePath: remoteDest,
  };
}
