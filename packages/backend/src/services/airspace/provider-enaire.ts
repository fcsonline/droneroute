/**
 * ENAIRE airspace provider – Spain.
 *
 * Queries the public ArcGIS REST services behind drones.enaire.es to fetch
 * drone restriction zones.  Each layer is classified as either "prohibited"
 * (hard no-fly) or "restricted" (requires authorisation / awareness).
 */

import type { AirspaceProvider, AirspaceZone, BBox, ZoneSeverity } from "./types.js";

// ---------------------------------------------------------------------------
// Layer definitions
// ---------------------------------------------------------------------------

interface EnairLayer {
  /** ArcGIS MapServer URL (up to and including the layer id). */
  url: string;
  severity: ZoneSeverity;
  category: string;
  /** Field that holds a human-readable name. */
  nameField: string;
  /** Field used as stable id.  Falls back to OBJECTID. */
  idField: string;
  /** Optional field with description text. */
  descriptionField?: string;
  /** Fields for altitude limits (values in metres). */
  lowerField?: string;
  upperField?: string;
}

const BASE = "https://servais.enaire.es/insignias/rest/services";

const LAYERS: EnairLayer[] = [
  // --- Prohibited -----------------------------------------------------------
  {
    url: `${BASE}/NSF/Drones_ZG_Aero_V3/MapServer/10`,
    severity: "prohibited",
    category: "restricted-airspace",
    nameField: "NAME_TXT",
    idField: "IDENT_TXT",
    descriptionField: "REMARKS_TXT",
    lowerField: "RESTRICCION_LOWER",
    upperField: "RESTRICCION_UPPER",
  },
  {
    url: `${BASE}/NSF/Drones_ZG_Aero_V3/MapServer/6`,
    severity: "prohibited",
    category: "airport",
    nameField: "NAME_TXT",
    idField: "IDENT_TXT",
    descriptionField: "REMARKS_TXT",
    lowerField: "RESTRICCION_LOWER",
    upperField: "RESTRICCION_UPPER",
  },
  {
    url: `${BASE}/NSF/Drones_ZG_Aero_V3/MapServer/3`,
    severity: "prohibited",
    category: "photo-restricted",
    nameField: "NOMBRE_50",
    idField: "MTN50_CLAS",
    descriptionField: "REMARKS_TXT",
    lowerField: "RESTRICCION_LOWER",
    upperField: "RESTRICCION_UPPER",
  },
  // --- Restricted -----------------------------------------------------------
  {
    url: `${BASE}/NSF/Drones_ZG_Aero_V3/MapServer/1`,
    severity: "restricted",
    category: "controlled-airspace",
    nameField: "NAME_TXT",
    idField: "IDENT_TXT",
    descriptionField: "REMARKS_TXT",
    lowerField: "RESTRICCION_LOWER",
    upperField: "RESTRICCION_UPPER",
  },
  {
    url: `${BASE}/NSF/Drones_ZG_Urbano_V0/MapServer/11`,
    severity: "restricted",
    category: "urban",
    nameField: "NAME_TXT",
    idField: "IDENT_TXT",
    descriptionField: "REMARKS_TXT",
    lowerField: "RESTRICCION_LOWER",
    upperField: "RESTRICCION_UPPER",
  },
  {
    url: `${BASE}/NSF/Drones_ZG_Infra_V0/MapServer/11`,
    severity: "restricted",
    category: "infrastructure",
    nameField: "name",
    idField: "GFID",
    descriptionField: "REMARKS_TXT",
    lowerField: "lower",
    upperField: "upper",
  },
  {
    url: `${BASE}/NOTAM/NOTAM_UAS_APP_V3/MapServer/1`,
    severity: "restricted",
    category: "notam",
    nameField: "FULLNAME",
    idField: "GFID",
    descriptionField: "DESCRIPTION",
    lowerField: "LOWER_VAL",
    upperField: "UPPER_VAL",
  },
  {
    url: `${BASE}/NSF/Drones_ZG_Aero_V3/MapServer/2`,
    severity: "restricted",
    category: "warning",
    nameField: "NAME_TXT",
    idField: "IDENT_TXT",
    descriptionField: "REMARKS_TXT",
    lowerField: "RESTRICCION_LOWER",
    upperField: "RESTRICCION_UPPER",
  },
  {
    url: `${BASE}/ENP/ENP_APP_Local_V4/MapServer/0`,
    severity: "restricted",
    category: "nature",
    nameField: "SITENAME",
    idField: "SITECODE",
  },
  {
    url: `${BASE}/ENP/ENP_APP_Local_V4/MapServer/1`,
    severity: "restricted",
    category: "bird-protection",
    nameField: "SITE_NAME",
    idField: "SITE_CODE",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build the set of outFields we need for a given layer. */
function outFields(layer: EnairLayer): string {
  const fields = new Set(["OBJECTID", layer.nameField, layer.idField]);
  if (layer.descriptionField) fields.add(layer.descriptionField);
  if (layer.lowerField) fields.add(layer.lowerField);
  if (layer.upperField) fields.add(layer.upperField);
  return [...fields].join(",");
}

/** Convert Web Mercator (EPSG:3857) bbox string for the spatial filter. */
function bboxToEnvelope(b: BBox): string {
  return `${b.west},${b.south},${b.east},${b.north}`;
}

async function queryLayer(layer: EnairLayer, bounds: BBox): Promise<AirspaceZone[]> {
  const params = new URLSearchParams({
    where: "1=1",
    geometry: bboxToEnvelope(bounds),
    geometryType: "esriGeometryEnvelope",
    spatialRel: "esriSpatialRelIntersects",
    inSR: "4326",
    outSR: "4326",
    outFields: outFields(layer),
    returnGeometry: "true",
    f: "geojson",
    resultRecordCount: "2000",
  });

  const url = `${layer.url}/query?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`ENAIRE: failed to query ${layer.url} – ${res.status}`);
    return [];
  }

  const json = await res.json() as GeoJSON.FeatureCollection;
  if (!json.features) return [];

  return json.features.map((f): AirspaceZone => {
    const p = f.properties ?? {};
    return {
      id: String(p[layer.idField] ?? p["OBJECTID"] ?? ""),
      name: String(p[layer.nameField] ?? ""),
      severity: layer.severity,
      geometry: f.geometry,
      altitudeLower: layer.lowerField ? numOrUndef(p[layer.lowerField]) : undefined,
      altitudeUpper: layer.upperField ? numOrUndef(p[layer.upperField]) : undefined,
      description: layer.descriptionField ? String(p[layer.descriptionField] ?? "") : undefined,
      category: layer.category,
      source: "enaire",
    };
  });
}

function numOrUndef(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const enaireProvider: AirspaceProvider = {
  id: "enaire",
  name: "ENAIRE (Spain)",

  async fetchZones(bounds: BBox): Promise<AirspaceZone[]> {
    const results = await Promise.allSettled(
      LAYERS.map((layer) => queryLayer(layer, bounds)),
    );

    const zones: AirspaceZone[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") {
        zones.push(...r.value);
      }
    }
    return zones;
  },
};
