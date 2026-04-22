import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../models/db.js";
import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyGoogleToken,
} from "../services/authService.js";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";

export const authRoutes = Router();

const isSelfHosted = () => (process.env.SELF_HOSTED ?? "true") === "true";

// ---------------------------------------------------------------------------
// Google OAuth sign-in (cloud mode only)
// ---------------------------------------------------------------------------
authRoutes.post("/google", async (req, res) => {
  if (isSelfHosted()) {
    res.status(404).json({
      error: "Google authentication is not available in self-hosted mode",
    });
    return;
  }

  const { credential } = req.body;
  if (!credential) {
    res.status(400).json({ error: "Missing Google credential" });
    return;
  }

  let verified;
  try {
    verified = await verifyGoogleToken(credential);
  } catch {
    res.status(500).json({ error: "Google authentication is not configured" });
    return;
  }

  if (!verified) {
    res.status(401).json({ error: "Invalid Google credential" });
    return;
  }

  const { email, googleId } = verified;
  const db = getDb();

  // Check if a user with this google_id already exists
  const existingByGoogle = db
    .prepare(
      "SELECT id, email, is_admin, is_banned FROM users WHERE google_id = ?",
    )
    .get(googleId) as any;

  if (existingByGoogle) {
    if (existingByGoogle.is_banned) {
      res
        .status(403)
        .json({ error: "Your account has been suspended", banned: true });
      return;
    }
    const token = generateToken(
      existingByGoogle.id,
      !!existingByGoogle.is_admin,
    );
    res.json({
      token,
      userId: existingByGoogle.id,
      email: existingByGoogle.email,
      isAdmin: !!existingByGoogle.is_admin,
    });
    return;
  }

  // Check if a user with this email exists (existing user linking Google account)
  const existingByEmail = db
    .prepare(
      "SELECT id, email, is_admin, is_banned FROM users WHERE LOWER(email) = LOWER(?)",
    )
    .get(email) as any;

  if (existingByEmail) {
    if (existingByEmail.is_banned) {
      res
        .status(403)
        .json({ error: "Your account has been suspended", banned: true });
      return;
    }
    // Link Google account and verify email
    db.prepare(
      "UPDATE users SET google_id = ?, email_verified = 1 WHERE id = ?",
    ).run(googleId, existingByEmail.id);

    const token = generateToken(existingByEmail.id, !!existingByEmail.is_admin);
    res.json({
      token,
      userId: existingByEmail.id,
      email: existingByEmail.email,
      isAdmin: !!existingByEmail.is_admin,
    });
    return;
  }

  // New user — create account with Google info (no password)
  const id = uuidv4();
  let isAdmin = false;
  const adminEmail = process.env.ADMIN_EMAIL || "";
  if (adminEmail && email.toLowerCase() === adminEmail.toLowerCase()) {
    isAdmin = true;
  }

  db.prepare(
    "INSERT INTO users (id, email, password_hash, google_id, email_verified, is_admin) VALUES (?, ?, '', ?, 1, ?)",
  ).run(id, email, googleId, isAdmin ? 1 : 0);

  const token = generateToken(id, isAdmin);
  res.status(201).json({ token, userId: id, email, isAdmin });
});

// ---------------------------------------------------------------------------
// Password-based routes (self-hosted mode only)
// ---------------------------------------------------------------------------
authRoutes.post("/register", (req, res) => {
  if (!isSelfHosted()) {
    res.status(410).json({
      error: "Password registration is disabled. Use Google sign-in.",
    });
    return;
  }

  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email);
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const id = uuidv4();
  const passwordHash = hashPassword(password);
  db.prepare(
    "INSERT INTO users (id, email, password_hash, email_verified) VALUES (?, ?, ?, 1)",
  ).run(id, email, passwordHash);

  const token = generateToken(id, false);
  res.status(201).json({ token, userId: id, email, isAdmin: false });
});

authRoutes.post("/login", (req, res) => {
  if (!isSelfHosted()) {
    res
      .status(410)
      .json({ error: "Password login is disabled. Use Google sign-in." });
    return;
  }

  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const db = getDb();
  const user = db
    .prepare(
      "SELECT id, email, password_hash, is_admin, is_banned FROM users WHERE email = ?",
    )
    .get(email) as any;

  if (
    !user ||
    !user.password_hash ||
    !comparePassword(password, user.password_hash)
  ) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (user.is_banned) {
    res
      .status(403)
      .json({ error: "Your account has been suspended", banned: true });
    return;
  }

  const token = generateToken(user.id, !!user.is_admin);
  res.json({
    token,
    userId: user.id,
    email: user.email,
    isAdmin: !!user.is_admin,
  });
});

authRoutes.post("/change-password", authMiddleware, (req: AuthRequest, res) => {
  if (!isSelfHosted()) {
    res
      .status(410)
      .json({ error: "Password management is disabled in cloud mode." });
    return;
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res
      .status(400)
      .json({ error: "Current password and new password are required" });
    return;
  }
  if (newPassword.length < 6) {
    res
      .status(400)
      .json({ error: "New password must be at least 6 characters" });
    return;
  }

  const db = getDb();
  const user = db
    .prepare("SELECT password_hash FROM users WHERE id = ?")
    .get(req.userId) as any;

  if (
    !user ||
    !user.password_hash ||
    !comparePassword(currentPassword, user.password_hash)
  ) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const newHash = hashPassword(newPassword);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
    newHash,
    req.userId,
  );

  res.json({ message: "Password updated" });
});
