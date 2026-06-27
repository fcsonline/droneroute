import { Router } from "express";
import { fetchZones, listProviders } from "../services/airspace/index.js";
import { airspaceLimiter } from "../middleware/rateLimit.js";

export const airspaceRoutes = Router();

/**
 * GET /api/airspace/zones?south=...&west=...&north=...&east=...&providers=enaire,dgac
 *
 * Returns all airspace restriction zones that intersect the given bounding box.
 * Zones are classified as "prohibited" (red) or "restricted" (orange).
 *
 * The optional `providers` param limits which country providers are queried.
 * When omitted, all providers are queried.
 */
airspaceRoutes.get("/zones", airspaceLimiter, async (req, res) => {
  const { south, west, north, east, providers } = req.query;

  if (!south || !west || !north || !east) {
    res
      .status(400)
      .json({ error: "Missing bounding box params: south, west, north, east" });
    return;
  }

  const bounds = {
    south: Number(south),
    west: Number(west),
    north: Number(north),
    east: Number(east),
  };

  if (Object.values(bounds).some((v) => !Number.isFinite(v))) {
    res
      .status(400)
      .json({ error: "Bounding box params must be valid numbers" });
    return;
  }

  const providerIds =
    typeof providers === "string" && providers.length > 0
      ? providers.split(",").map((s) => s.trim())
      : undefined;

  try {
    const zones = await fetchZones(bounds, providerIds);
    res.json({ zones });
  } catch (err) {
    console.error("Airspace fetch error:", err);
    res
      .status(502)
      .json({ error: "Failed to fetch airspace data from upstream providers" });
  }
});

/**
 * GET /api/airspace/providers
 *
 * Returns the list of available airspace providers.
 */
airspaceRoutes.get("/providers", (_req, res) => {
  res.json({ providers: listProviders() });
});
