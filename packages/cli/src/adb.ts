import { execFileSync } from "node:child_process";
import { ADB_WAYPOINT_PATH } from "./constants.js";

/** A single device entry parsed from `adb devices -l`. */
export interface AdbDevice {
  serial: string;
  model: string;
  device: string;
  product: string;
  transportId: string;
}

/**
 * Check whether `adb` is available in $PATH.
 */
export function isAdbAvailable(): boolean {
  try {
    execFileSync("adb", ["version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse `adb devices -l` output into structured device records.
 *
 * Example output line:
 *   3A2F4B1C  device  usb:1-1  product:RC231  model:DJI_RC_2  device:RC231  transport_id:3
 */
export function getAdbDevices(): AdbDevice[] {
  try {
    const output = execFileSync("adb", ["devices", "-l"], {
      stdio: "pipe",
      encoding: "utf-8",
      timeout: 10_000,
    });

    const devices: AdbDevice[] = [];

    for (const line of output.split("\n")) {
      // Skip the header and blank lines
      if (!line.includes("device") || line.startsWith("List of")) continue;
      // Skip offline / unauthorized / recovery
      if (line.includes("offline") || line.includes("unauthorized") || line.includes("recovery")) continue;

      const parts = line.trim().split(/\s+/);
      const serial = parts[0];
      if (!serial || parts[1] !== "device") continue;

      const get = (key: string): string => {
        const match = parts.find((p) => p.startsWith(`${key}:`));
        return match ? match.slice(key.length + 1) : "";
      };

      devices.push({
        serial,
        model: get("model"),
        device: get("device"),
        product: get("product"),
        transportId: get("transport_id"),
      });
    }

    return devices;
  } catch {
    return [];
  }
}

/**
 * Run a shell command on a connected adb device.
 */
export function adbShell(serial: string, cmd: string): string {
  return execFileSync("adb", ["-s", serial, "shell", cmd], {
    stdio: "pipe",
    encoding: "utf-8",
    timeout: 10_000,
  }).trim();
}

/**
 * Create a directory on the device (with parents).
 */
export function adbMkdir(serial: string, remotePath: string): void {
  adbShell(serial, `mkdir -p "${remotePath}"`);
}

/**
 * Push a local file to the device.
 */
export function adbPush(serial: string, localPath: string, remotePath: string): void {
  execFileSync("adb", ["-s", serial, "push", localPath, remotePath], {
    stdio: "pipe",
    timeout: 30_000,
  });
}

/**
 * Check whether the DJI waypoint directory exists on a device.
 */
export function hasWaypointDir(serial: string): boolean {
  try {
    const result = adbShell(serial, `[ -d "${ADB_WAYPOINT_PATH}" ] && echo yes || echo no`);
    return result === "yes";
  } catch {
    return false;
  }
}
