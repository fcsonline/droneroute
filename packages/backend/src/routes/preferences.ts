import { Router } from "express";
import { getDb } from "../models/db.js";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import {
  DEFAULT_USER_PREFERENCES,
  type UserPreferences,
} from "@droneroute/shared";

export const preferencesRoutes = Router();

// Get user preferences
preferencesRoutes.get("/", authMiddleware, (req: AuthRequest, res) => {
  const db = getDb();
  const row = db
    .prepare("SELECT preferences FROM user_preferences WHERE user_id = ?")
    .get(req.userId!) as { preferences: string } | undefined;

  if (!row) {
    res.json(DEFAULT_USER_PREFERENCES);
    return;
  }

  try {
    const saved = JSON.parse(row.preferences);
    // Merge with defaults to fill in any new fields
    const merged: UserPreferences = {
      visualization: {
        ...DEFAULT_USER_PREFERENCES.visualization,
        ...saved.visualization,
      },
      missionDefaults: {
        ...DEFAULT_USER_PREFERENCES.missionDefaults,
        ...saved.missionDefaults,
      },
    };
    res.json(merged);
  } catch {
    res.json(DEFAULT_USER_PREFERENCES);
  }
});

// Update user preferences
preferencesRoutes.put("/", authMiddleware, (req: AuthRequest, res) => {
  const db = getDb();
  const preferences = JSON.stringify(req.body);

  db.prepare(
    `INSERT INTO user_preferences (user_id, preferences, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET preferences = ?, updated_at = datetime('now')`,
  ).run(req.userId!, preferences, preferences);

  res.json({ message: "Preferences saved" });
});
