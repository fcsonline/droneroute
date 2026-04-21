import { Router } from "express";
import { randomBytes } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../models/db.js";
import {
  authMiddleware,
  optionalAuth,
  type AuthRequest,
} from "../middleware/auth.js";
import type { SharedMission } from "@droneroute/shared";

export const sharedRoutes = Router();

// Enable sharing for a mission (generates share token)
sharedRoutes.post(
  "/missions/:id/share",
  authMiddleware,
  (req: AuthRequest, res) => {
    const db = getDb();
    const mission = db
      .prepare("SELECT id, user_id, share_token FROM missions WHERE id = ?")
      .get(req.params.id) as any;

    if (!mission) {
      res.status(404).json({ error: "Mission not found" });
      return;
    }

    if (mission.user_id !== req.userId) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    // If already shared, return existing token
    if (mission.share_token) {
      const shareUrl = `${req.protocol}://${req.get("host")}/shared/${mission.share_token}`;
      res.json({ shareToken: mission.share_token, shareUrl });
      return;
    }

    // Generate a URL-safe random token
    const shareToken = randomBytes(16).toString("base64url");
    db.prepare("UPDATE missions SET share_token = ? WHERE id = ?").run(
      shareToken,
      req.params.id,
    );

    const shareUrl = `${req.protocol}://${req.get("host")}/shared/${shareToken}`;
    res.json({ shareToken, shareUrl });
  },
);

// Revoke sharing for a mission
sharedRoutes.delete(
  "/missions/:id/share",
  authMiddleware,
  (req: AuthRequest, res) => {
    const db = getDb();
    const mission = db
      .prepare("SELECT id, user_id FROM missions WHERE id = ?")
      .get(req.params.id) as any;

    if (!mission) {
      res.status(404).json({ error: "Mission not found" });
      return;
    }

    if (mission.user_id !== req.userId) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    db.prepare("UPDATE missions SET share_token = NULL WHERE id = ?").run(
      req.params.id,
    );
    res.json({ success: true });
  },
);

// Get a shared mission by token (public, no auth required)
sharedRoutes.get("/shared/:token", (req, res) => {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT m.id, m.name, m.config, m.waypoints, m.pois, m.obstacles, m.share_token, m.created_at, m.updated_at, u.email
       FROM missions m
       LEFT JOIN users u ON m.user_id = u.id
       WHERE m.share_token = ?`,
    )
    .get(req.params.token) as any;

  if (!row) {
    res.status(404).json({ error: "Shared mission not found" });
    return;
  }

  const mission: SharedMission = {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    shareToken: row.share_token,
    ownerEmail: row.email || undefined,
    config: JSON.parse(row.config),
    waypoints: JSON.parse(row.waypoints),
    pois: JSON.parse(row.pois || "[]"),
    obstacles: JSON.parse(row.obstacles || "[]"),
  };

  res.json(mission);
});

// Clone a shared mission to the authenticated user's account
sharedRoutes.post(
  "/shared/:token/clone",
  authMiddleware,
  (req: AuthRequest, res) => {
    const db = getDb();
    const row = db
      .prepare(
        "SELECT name, config, waypoints, pois, obstacles FROM missions WHERE share_token = ?",
      )
      .get(req.params.token) as any;

    if (!row) {
      res.status(404).json({ error: "Shared mission not found" });
      return;
    }

    const id = uuidv4();
    const name = `${row.name} (copy)`;

    db.prepare(
      "INSERT INTO missions (id, name, user_id, config, waypoints, pois, obstacles) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(
      id,
      name,
      req.userId!,
      row.config,
      row.waypoints,
      row.pois || "[]",
      row.obstacles || "[]",
    );

    res.status(201).json({ id, name });
  },
);
