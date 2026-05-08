import type { WpmzDocument, WpmzFiles, WpmzProfile } from "./types.js";

export const DJI_WPML_PROFILE: WpmzProfile = {
  id: "dji-wpml",
  kmlNamespace: "http://www.opengis.net/kml/2.2",
  wpmlNamespace: "http://www.dji.com/wpmz/1.0.2",
  timestampFormat: "milliseconds",
  templateStyle: "full-waypoint",
  includePayloadInfo: "always",
  includeTakeOffSecurityHeight: "when-present",
  includeWaylineDistanceDuration: "when-present",
  waylineHeightModeElement: "executeHeightMode",
};

/**
 * Profile observed in DJI Fly-style waypoint KMZs from the uploaded Lito X1 sample.
 * The key differences are the uav.com WPML namespace, minimal template.kml, seconds timestamps,
 * and wayline-level executeHeightMode/distance/duration fields.
 */
export const DJI_FLY_UAV_PROFILE: WpmzProfile = {
  id: "dji-fly-uav",
  kmlNamespace: "http://www.opengis.net/kml/2.2",
  wpmlNamespace: "http://www.uav.com/wpmz/1.0.2",
  timestampFormat: "seconds-float",
  templateStyle: "minimal-mission-config",
  includePayloadInfo: "when-present",
  includeTakeOffSecurityHeight: "when-present",
  includeWaylineDistanceDuration: "always",
  waylineHeightModeElement: "executeHeightMode",
};

export function inferProfileFromNamespaces(
  wpmlNamespace: string | undefined,
): WpmzProfile {
  if (wpmlNamespace === DJI_FLY_UAV_PROFILE.wpmlNamespace)
    return DJI_FLY_UAV_PROFILE;
  if (wpmlNamespace === DJI_WPML_PROFILE.wpmlNamespace) return DJI_WPML_PROFILE;
  return {
    ...DJI_WPML_PROFILE,
    id: "custom",
    wpmlNamespace: wpmlNamespace ?? DJI_WPML_PROFILE.wpmlNamespace,
  };
}

export function inferProfileFromFiles(files: Partial<WpmzFiles>): WpmzProfile {
  const source = `${files.templateKml ?? ""}\n${files.waylinesWpml ?? ""}`;
  const wpmlNamespace = source.match(/xmlns:wpml\s*=\s*["']([^"']+)["']/u)?.[1];
  return inferProfileFromNamespaces(wpmlNamespace);
}

export function profileForDocument(
  doc: WpmzDocument,
  override?: WpmzProfile,
): WpmzProfile {
  if (override) return override;
  if (doc.profileId === "dji-fly-uav") return DJI_FLY_UAV_PROFILE;
  if (doc.profileId === "dji-wpml") return DJI_WPML_PROFILE;
  return inferProfileFromNamespaces(doc.wpmlNamespace);
}

export function nowForProfile(profile: WpmzProfile): string {
  const ms = Date.now();
  if (profile.timestampFormat === "seconds-float")
    return (ms / 1000).toFixed(4);
  return String(ms);
}
