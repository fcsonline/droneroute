import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { initDb } from "./models/db.js";
import { missionRoutes } from "./routes/missions.js";
import { kmzRoutes } from "./routes/kmz.js";
import { authRoutes } from "./routes/auth.js";
import { sharedRoutes } from "./routes/shared.js";
import { adminRoutes } from "./routes/admin.js";
import { SELF_HOSTED, ADMIN_EMAIL } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Serve frontend static files in production
const frontendDist = path.join(__dirname, "../../frontend/dist");
app.use(express.static(frontendDist));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/missions", missionRoutes);
app.use("/api/kmz", kmzRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", sharedRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// SPA fallback (Express 5 syntax)
app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

// Initialize database and start server
initDb();
app.listen(PORT, () => {
  console.log(`DroneRoute server running on http://localhost:${PORT}`);
  console.log(`Mode: ${SELF_HOSTED ? "self-hosted" : "cloud"}${!SELF_HOSTED && ADMIN_EMAIL ? ` (admin: ${ADMIN_EMAIL})` : ""}`);
});
