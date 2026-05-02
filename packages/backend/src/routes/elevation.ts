import { Router } from "express";
import { fetchElevations } from "../services/elevationService.js";

export const elevationRoutes = Router();

/**
 * POST /api/elevation
 * Body: { locations: [{ latitude, longitude }, ...] }
 * Returns: { results: [{ latitude, longitude, elevation }, ...] }
 *
 * Proxies requests to Open Elevation API to avoid CORS issues.
 */
elevationRoutes.post("/", async (req, res) => {
  try {
    const { locations } = req.body as {
      locations: { latitude: number; longitude: number }[];
    };

    if (!Array.isArray(locations) || locations.length === 0) {
      res.status(400).json({ error: "locations array is required" });
      return;
    }

    if (locations.length > 200) {
      res
        .status(400)
        .json({ error: "Maximum 200 locations per request allowed" });
      return;
    }

    for (const loc of locations) {
      if (
        typeof loc.latitude !== "number" ||
        typeof loc.longitude !== "number" ||
        loc.latitude < -90 ||
        loc.latitude > 90 ||
        loc.longitude < -180 ||
        loc.longitude > 180
      ) {
        res.status(400).json({ error: "Invalid coordinates in locations" });
        return;
      }
    }

    const elevations = await fetchElevations(locations);
    const results = locations.map((loc, i) => ({
      latitude: loc.latitude,
      longitude: loc.longitude,
      elevation: elevations[i],
    }));

    res.json({ results });
  } catch (err: any) {
    console.error("Elevation lookup error:", err);
    res.status(502).json({ error: "Elevation service unavailable" });
  }
});
