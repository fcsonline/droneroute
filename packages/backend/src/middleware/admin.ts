import type { Response, NextFunction } from "express";
import { getDb } from "../models/db.js";
import type { AuthRequest } from "./auth.js";
import { SELF_HOSTED } from "../config.js";

export { SELF_HOSTED, ADMIN_EMAIL } from "../config.js";

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  if (SELF_HOSTED) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (!req.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const db = getDb();
  const user = db.prepare("SELECT is_admin FROM users WHERE id = ?").get(req.userId) as any;

  if (!user || !user.is_admin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  next();
}
