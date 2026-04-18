/**
 * Generic airspace restriction types.
 *
 * Any country-specific provider implements `AirspaceProvider` and maps its
 * native zone data into these common types.  The frontend only knows about
 * `AirspaceZone` and the two severity levels.
 */

export type ZoneSeverity = "prohibited" | "restricted";

export interface AirspaceZone {
  /** Stable identifier within the provider (e.g. "LER163"). */
  id: string;
  /** Human-readable zone name. */
  name: string;
  severity: ZoneSeverity;
  /** GeoJSON geometry – typically Polygon or MultiPolygon. */
  geometry: GeoJSON.Geometry;
  /** Lower altitude limit in metres AGL (0 = ground). */
  altitudeLower?: number;
  /** Upper altitude limit in metres AGL. */
  altitudeUpper?: number;
  /** Localised description / remarks. */
  description?: string;
  /** Free-form category tag, e.g. "airport", "military", "nature". */
  category?: string;
  /** Provider id that produced this zone. */
  source: string;
}

export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface AirspaceProvider {
  /** Unique id, e.g. "enaire". */
  id: string;
  /** Display name, e.g. "ENAIRE (Spain)". */
  name: string;
  /** Return all zones intersecting the given bounding box. */
  fetchZones(bounds: BBox): Promise<AirspaceZone[]>;
}
