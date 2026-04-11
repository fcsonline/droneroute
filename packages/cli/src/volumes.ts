import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { WAYPOINT_PATH } from "./constants.js";

/** A DJI controller detected via a mounted filesystem. */
export interface MountedDevice {
  /** Human-readable label, e.g. "SD card (/Volumes/DJI_RC)". */
  label: string;
  /** Full path to the waypoint directory on the mounted volume. */
  waypointPath: string;
  /** Mount point root. */
  mountPoint: string;
}

/**
 * Scan all plausible mount points for volumes that contain the DJI
 * waypoint directory structure.
 */
export function findMountedDevices(): MountedDevice[] {
  const roots = getMountRoots();
  const devices: MountedDevice[] = [];

  for (const root of roots) {
    const waypointPath = path.join(root, WAYPOINT_PATH);

    try {
      const stat = fs.statSync(waypointPath);
      if (stat.isDirectory()) {
        const name = path.basename(root);
        devices.push({
          label: `${name} (${root})`,
          waypointPath,
          mountPoint: root,
        });
      }
    } catch {
      // Path doesn't exist — skip
    }
  }

  return devices;
}

/**
 * Return a list of mount-point roots to probe, depending on the platform.
 */
function getMountRoots(): string[] {
  const platform = os.platform();

  if (platform === "darwin") {
    return listSubdirs("/Volumes");
  }

  if (platform === "linux") {
    const user = os.userInfo().username;
    return [
      ...listSubdirs("/media"),
      ...listSubdirs(`/media/${user}`),
      ...listSubdirs("/mnt"),
      ...listSubdirs(`/run/media/${user}`),
    ];
  }

  if (platform === "win32") {
    // Check drive letters D: through Z:
    const drives: string[] = [];
    for (let code = 68; code <= 90; code++) {
      const letter = `${String.fromCharCode(code)}:\\`;
      try {
        fs.accessSync(letter, fs.constants.R_OK);
        drives.push(letter);
      } catch {
        // Drive not available
      }
    }
    return drives;
  }

  return [];
}

/**
 * List immediate subdirectories of a directory, returning their full paths.
 * Returns an empty array if the directory doesn't exist.
 */
function listSubdirs(dir: string): string[] {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() || d.isSymbolicLink())
      .map((d) => path.join(dir, d.name));
  } catch {
    return [];
  }
}
