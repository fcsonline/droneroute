import { Router } from "express";
import { fetchZones } from "../services/airspace/index.js";

export const airspaceRoutes = Router();

/**
 * GET /api/airspace/zones?south=...&west=...&north=...&east=...
 *
 * Returns all airspace restriction zones that intersect the given bounding box.
 * Zones are classified as "prohibited" (red) or "restricted" (orange).
 */
airspaceRoutes.get("/zones", async (req, res) => {
  const { south, west, north, east } = req.query;

  if (!south || !west || !north || !east) {
    res.status(400).json({ error: "Missing bounding box params: south, west, north, east" });
    return;
  }

  const bounds = {
    south: Number(south),
    west: Number(west),
    north: Number(north),
    east: Number(east),
  };

  if (Object.values(bounds).some((v) => !Number.isFinite(v))) {
    res.status(400).json({ error: "Bounding box params must be valid numbers" });
    return;
  }

  try {
    const zones = await fetchZones(bounds);
    res.json({ zones });
  } catch (err) {
    console.error("Airspace fetch error:", err);
    res.status(502).json({ error: "Failed to fetch airspace data from upstream providers" });
  }
});
