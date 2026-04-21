import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../../data/droneroute.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    import("fs").then((fs) => fs.mkdirSync(dir, { recursive: true }));
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
      password_hash TEXT NOT NULL,
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
    database.exec(`ALTER TABLE missions ADD COLUMN pois TEXT NOT NULL DEFAULT '[]'`);
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
    database.exec(`ALTER TABLE missions ADD COLUMN obstacles TEXT NOT NULL DEFAULT '[]'`);
  } catch {
    // Column already exists — ignore
  }

  // Ensure unique index on share_token
  database.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_missions_share_token ON missions(share_token) WHERE share_token IS NOT NULL`);

  console.log("Database initialized at", DB_PATH);
}
