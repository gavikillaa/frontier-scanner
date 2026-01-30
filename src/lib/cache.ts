import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);

// Create cache table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  )
`);

// Create index for faster expiration checks
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON cache(expires_at)
`);

// Prepared statements for better performance
const getStmt = db.prepare("SELECT value, expires_at FROM cache WHERE key = ?");
const setStmt = db.prepare(
  "INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)"
);
const deleteStmt = db.prepare("DELETE FROM cache WHERE key = ?");
const cleanupStmt = db.prepare("DELETE FROM cache WHERE expires_at < ?");
const statsStmt = db.prepare("SELECT COUNT(*) as count FROM cache");

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Get a value from the cache
 * Returns null if not found or expired
 */
export function get<T>(key: string): T | null {
  const now = Date.now();
  const row = getStmt.get(key) as { value: string; expires_at: number } | undefined;

  if (!row) {
    return null;
  }

  if (row.expires_at < now) {
    // Entry expired, delete it
    deleteStmt.run(key);
    return null;
  }

  try {
    return JSON.parse(row.value) as T;
  } catch {
    // Invalid JSON, delete the entry
    deleteStmt.run(key);
    return null;
  }
}

/**
 * Set a value in the cache
 * @param key - Cache key
 * @param value - Value to cache (will be JSON serialized)
 * @param ttlMinutes - Time to live in minutes
 */
export function set<T>(key: string, value: T, ttlMinutes: number): void {
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
  const serialized = JSON.stringify(value);
  setStmt.run(key, serialized, expiresAt);
}

/**
 * Delete a value from the cache
 */
export function del(key: string): void {
  deleteStmt.run(key);
}

/**
 * Clean up expired entries
 */
export function cleanup(): number {
  const result = cleanupStmt.run(Date.now());
  return result.changes;
}

/**
 * Get cache statistics
 */
export function stats(): { count: number } {
  const row = statsStmt.get() as { count: number };
  return { count: row.count };
}

/**
 * Check if a key exists and is not expired
 */
export function has(key: string): boolean {
  return get(key) !== null;
}

export const cache = {
  get,
  set,
  del,
  cleanup,
  stats,
  has,
};

export default cache;
