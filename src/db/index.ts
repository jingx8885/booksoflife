import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";

// Database instance for Node.js environment
let dbInstance: ReturnType<typeof drizzle> | null = null;

export function db() {
  let databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  // In Node.js environment, use singleton pattern
  if (dbInstance) {
    return dbInstance;
  }

  // Remove file:// prefix if present
  const dbPath = databaseUrl.replace("file://", "").replace("file:", "");
  
  // SQLite connection
  const sqlite = new Database(dbPath);
  dbInstance = drizzle({ client: sqlite });

  return dbInstance;
}

// Export direct db instance for convenience
export { db as default };
export const database = db();
