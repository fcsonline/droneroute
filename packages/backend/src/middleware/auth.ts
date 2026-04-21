import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/authService.js";
import { getDb } from "../models/db.js";

export interface AuthRequest extends Request {
  userId?: string;
  isAdmin?: boolean;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  // Check if user is banned
  const db = getDb();
  const user = db.prepare("SELECT is_banned, is_admin FROM users WHERE id = ?").get(payload.userId) as any;
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  if (user.is_banned) {
    res.status(403).json({ error: "Your account has been suspended", banned: true });
    return;
  }

  req.userId = payload.userId;
  req.isAdmin = !!user.is_admin;
  next();
}

/** Optional auth - sets userId if token present, but doesn't reject */
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7);
    const payload = verifyToken(token);
    if (payload) {
      req.userId = payload.userId;
    }
  }
  next();
}
