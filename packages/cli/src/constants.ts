/**
 * DJI controller paths and known device identifiers.
 */

/** Relative waypoint directory on DJI RC internal storage. */
export const WAYPOINT_PATH = "Android/data/dji.go.v5/files/waypoint";

/** Absolute waypoint path as seen via adb shell. */
export const ADB_WAYPOINT_PATH = `/sdcard/${WAYPOINT_PATH}`;

/**
 * Substrings that may appear in the `model:` or `device:` field of
 * `adb devices -l` output for known DJI RC controllers.
 *
 * We intentionally keep this list broad — the real gate is whether the
 * waypoint directory exists on the device.
 */
export const DJI_MODEL_HINTS = [
  "DJI_RC",
  "RM500",  // DJI RC
  "RM510",  // DJI RC Motion
  "RM520",  // DJI RC-N1
  "RM530",  // DJI RC Pro
  "RC231",  // DJI RC 2
  "RC232",  // DJI RC Pro 2
  "RC-N1",
  "RC-N2",
];

/** File extension used by DJI Fly for waypoint missions. */
export const KMZ_EXTENSION = ".KMZ";
