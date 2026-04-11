import { select } from "@inquirer/prompts";
import { isAdbAvailable, getAdbDevices, hasWaypointDir } from "./adb.js";
import { findMountedDevices } from "./volumes.js";
import { DJI_MODEL_HINTS } from "./constants.js";

/** Unified representation of a detected DJI controller. */
export interface DjiDevice {
  type: "mounted" | "adb";
  label: string;
  /** For mounted devices: full path to the waypoint directory. */
  waypointPath?: string;
  /** For adb devices: serial number. */
  serial?: string;
}

/**
 * Detect all connected DJI controllers by scanning mounted volumes and
 * querying adb. Returns a merged, deduplicated list.
 */
export function detectDevices(): DjiDevice[] {
  const devices: DjiDevice[] = [];

  // 1. Mounted volumes (always available, no external tooling)
  for (const vol of findMountedDevices()) {
    devices.push({
      type: "mounted",
      label: vol.label,
      waypointPath: vol.waypointPath,
    });
  }

  // 2. adb devices (only if adb is installed)
  if (isAdbAvailable()) {
    for (const dev of getAdbDevices()) {
      // First check if the model looks like a DJI controller
      const isDji = DJI_MODEL_HINTS.some(
        (hint) =>
          dev.model.toUpperCase().includes(hint.toUpperCase()) ||
          dev.device.toUpperCase().includes(hint.toUpperCase()) ||
          dev.product.toUpperCase().includes(hint.toUpperCase()),
      );

      // Even if the model isn't recognized, check for the waypoint dir
      if (isDji || hasWaypointDir(dev.serial)) {
        const label = dev.model
          ? `${dev.model.replace(/_/g, " ")} (adb: ${dev.serial})`
          : `Android device (adb: ${dev.serial})`;

        devices.push({
          type: "adb",
          label,
          serial: dev.serial,
        });
      }
    }
  }

  return devices;
}

/**
 * If there's exactly one device, return it. Otherwise prompt the user
 * to pick one.
 */
export async function selectDevice(devices: DjiDevice[]): Promise<DjiDevice> {
  if (devices.length === 1) {
    return devices[0];
  }

  return select({
    message: "Multiple DJI controllers found. Select one:",
    choices: devices.map((d) => ({
      name: d.label,
      value: d,
    })),
  });
}
