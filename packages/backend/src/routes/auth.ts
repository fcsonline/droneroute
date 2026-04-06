import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../models/db.js";
import { hashPassword, comparePassword, generateToken } from "../services/authService.js";

export const authRoutes = Router();

authRoutes.post("/register", (req, res) => {
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
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const id = uuidv4();
  const passwordHash = hashPassword(password);
  db.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)").run(
    id,
    email,
    passwordHash
  );

  const token = generateToken(id);
  res.status(201).json({ token, userId: id, email });
});

authRoutes.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const db = getDb();
  const user = db
    .prepare("SELECT id, email, password_hash FROM users WHERE email = ?")
    .get(email) as any;

  if (!user || !comparePassword(password, user.password_hash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = generateToken(user.id);
  res.json({ token, userId: user.id, email: user.email });
});
