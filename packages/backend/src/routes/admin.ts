import { Router, type Response, type NextFunction } from "express";
import { getDb } from "../models/db.js";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";

export const adminRoutes = Router();

// Admin guard — reads env at request time to avoid module initialization issues
function adminGuard(req: AuthRequest, res: Response, next: NextFunction): void {
  if ((process.env.SELF_HOSTED ?? "true") === "true") {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (!req.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const db = getDb();
  const user = db
    .prepare("SELECT is_admin FROM users WHERE id = ?")
    .get(req.userId) as any;

  if (!user || !user.is_admin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  next();
}

// All admin routes require auth + admin
adminRoutes.use(authMiddleware, adminGuard);

// GET /api/admin/users?page=1&perPage=20
adminRoutes.get("/users", (req: AuthRequest, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const perPage = Math.min(
    100,
    Math.max(1, parseInt(req.query.perPage as string) || 20),
  );
  const offset = (page - 1) * perPage;

  const db = getDb();

  const total = (db.prepare("SELECT COUNT(*) as count FROM users").get() as any)
    .count;

  const users = db
    .prepare(
      `SELECT u.id, u.email, u.created_at, u.is_admin, u.is_banned,
              COUNT(m.id) as mission_count
       FROM users u
       LEFT JOIN missions m ON m.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(perPage, offset) as any[];

  res.json({
    data: users.map((u) => ({
      id: u.id,
      email: u.email,
      createdAt: u.created_at,
      isAdmin: !!u.is_admin,
      isBanned: !!u.is_banned,
      missionCount: u.mission_count,
    })),
    page,
    perPage,
    total,
  });
});

// POST /api/admin/users/:id/ban
adminRoutes.post("/users/:id/ban", (req: AuthRequest, res) => {
  if (req.params.id === req.userId) {
    res.status(400).json({ error: "Cannot ban yourself" });
    return;
  }

  const db = getDb();
  const result = db
    .prepare("UPDATE users SET is_banned = 1 WHERE id = ?")
    .run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ message: "User banned" });
});

// POST /api/admin/users/:id/unban
adminRoutes.post("/users/:id/unban", (req: AuthRequest, res) => {
  if (req.params.id === req.userId) {
    res.status(400).json({ error: "Cannot unban yourself" });
    return;
  }

  const db = getDb();
  const result = db
    .prepare("UPDATE users SET is_banned = 0 WHERE id = ?")
    .run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ message: "User unbanned" });
});

// POST /api/admin/users/:id/promote
adminRoutes.post("/users/:id/promote", (req: AuthRequest, res) => {
  if (req.params.id === req.userId) {
    res.status(400).json({ error: "Cannot promote yourself" });
    return;
  }

  const db = getDb();
  const result = db
    .prepare("UPDATE users SET is_admin = 1 WHERE id = ?")
    .run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ message: "User promoted to admin" });
});

// POST /api/admin/users/:id/demote
adminRoutes.post("/users/:id/demote", (req: AuthRequest, res) => {
  if (req.params.id === req.userId) {
    res.status(400).json({ error: "Cannot demote yourself" });
    return;
  }

  const db = getDb();
  const result = db
    .prepare("UPDATE users SET is_admin = 0 WHERE id = ?")
    .run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ message: "User demoted" });
});
