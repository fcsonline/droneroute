import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, "../../data/genmap.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
  }
  return db;
}

export function initDb(): void {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      google_id TEXT,
      email_verified INTEGER NOT NULL DEFAULT 0,
      is_admin INTEGER NOT NULL DEFAULT 0,
      is_banned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS missions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      user_id TEXT,
      config TEXT NOT NULL,
      waypoints TEXT NOT NULL,
      pois TEXT NOT NULL DEFAULT '[]',
      share_token TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Migration: add pois column if missing (for existing DBs)
  try {
    database.exec(
      `ALTER TABLE missions ADD COLUMN pois TEXT NOT NULL DEFAULT '[]'`,
    );
  } catch {
    // Column already exists — ignore
  }

  // Migration: add share_token column if missing (for existing DBs)
  try {
    database.exec(`ALTER TABLE missions ADD COLUMN share_token TEXT`);
  } catch {
    // Column already exists — ignore
  }

  // Migration: add obstacles column if missing (for existing DBs)
  try {
    database.exec(
      `ALTER TABLE missions ADD COLUMN obstacles TEXT NOT NULL DEFAULT '[]'`,
    );
  } catch {
    // Column already exists — ignore
  }

  // Ensure unique index on share_token
  database.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_missions_share_token ON missions(share_token) WHERE share_token IS NOT NULL`,
  );

  // Migration: add is_admin column if missing (for existing DBs)
  try {
    database.exec(
      `ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0`,
    );
  } catch {
    // Column already exists — ignore
  }

  // Migration: add is_banned column if missing (for existing DBs)
  try {
    database.exec(
      `ALTER TABLE users ADD COLUMN is_banned INTEGER NOT NULL DEFAULT 0`,
    );
  } catch {
    // Column already exists — ignore
  }

  // Migration: add google_id column if missing (for existing DBs)
  try {
    database.exec(`ALTER TABLE users ADD COLUMN google_id TEXT`);
  } catch {
    // Column already exists — ignore
  }

  // Migration: add email_verified column if missing (for existing DBs)
  try {
    database.exec(
      `ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0`,
    );
  } catch {
    // Column already exists — ignore
  }

  // Ensure ADMIN_EMAIL user has admin privileges (cloud mode)
  const selfHosted = (process.env.SELF_HOSTED ?? "true") === "true";
  const adminEmail = process.env.ADMIN_EMAIL || "";
  if (!selfHosted && adminEmail) {
    database
      .prepare("UPDATE users SET is_admin = 1 WHERE LOWER(email) = LOWER(?)")
      .run(adminEmail);
  }

  console.log("Database initialized at", DB_PATH);
}
