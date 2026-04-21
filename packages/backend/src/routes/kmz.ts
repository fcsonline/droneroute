import { Router } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import type { Mission } from "@droneroute/shared";
import { DEFAULT_MISSION_CONFIG } from "@droneroute/shared";
import { generateKmzBuffer } from "../services/kmzGenerator.js";
import { parseKmz } from "../services/kmzParser.js";
import { getDb } from "../models/db.js";
import {
  authMiddleware,
  optionalAuth,
  type AuthRequest,
} from "../middleware/auth.js";

export const kmzRoutes = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Generate and download KMZ from mission data (POST body)
kmzRoutes.post("/generate", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, config, waypoints, pois } = req.body;
    if (!config || !waypoints || waypoints.length < 2) {
      res
        .status(400)
        .json({ error: "At least 2 waypoints and a config are required" });
      return;
    }

    const mission: Mission = {
      id: uuidv4(),
      name: name || "mission",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      config,
      waypoints,
      pois: pois || [],
      obstacles: [],
    };

    const buffer = await generateKmzBuffer(mission);

    const filename = `${mission.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.kmz`;
    res.setHeader("Content-Type", "application/vnd.google-earth.kmz");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err: any) {
    console.error("KMZ download error:", err);
    res.status(500).json({ error: "Failed to generate KMZ" });
  }
});

// Download KMZ for a saved mission
kmzRoutes.get(
  "/download/:missionId",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const db = getDb();
      const row = db
        .prepare("SELECT * FROM missions WHERE id = ? AND user_id = ?")
        .get(req.params.missionId, req.userId) as any;
      if (!row) {
        res.status(404).json({ error: "Mission not found" });
        return;
      }

      const mission: Mission = {
        id: row.id,
        name: row.name,
        userId: row.user_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        config: JSON.parse(row.config),
        waypoints: JSON.parse(row.waypoints),
        pois: JSON.parse(row.pois || "[]"),
        obstacles: JSON.parse(row.obstacles || "[]"),
      };

      const buffer = await generateKmzBuffer(mission);
      const filename = `${mission.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.kmz`;
      res.setHeader("Content-Type", "application/vnd.google-earth.kmz");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.send(buffer);
    } catch (err: any) {
      console.error("KMZ download error:", err);
      res.status(500).json({ error: err.message || "Failed to generate KMZ" });
    }
  },
);

// Import KMZ file
kmzRoutes.post(
  "/import",
  optionalAuth,
  upload.single("file"),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const { config, waypoints, pois } = await parseKmz(req.file.buffer);

      // Optionally save to DB
      const save = req.query.save === "true";
      let missionId: string | undefined;

      if (save) {
        const db = getDb();
        missionId = uuidv4();
        const name =
          req.file.originalname.replace(/\.kmz$/i, "") || "Imported Mission";
        db.prepare(
          "INSERT INTO missions (id, name, user_id, config, waypoints, pois, obstacles) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ).run(
          missionId,
          name,
          req.userId || null,
          JSON.stringify(config),
          JSON.stringify(waypoints),
          JSON.stringify(pois),
          "[]",
        );
      }

      res.json({ id: missionId, config, waypoints, pois });
    } catch (err: any) {
      console.error("KMZ import error:", err);
      res.status(500).json({ error: "Failed to parse KMZ" });
    }
  },
);
