import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { DATABASE_PATH, now } from "../lib/config.server.ts";
import { runMigrations } from "./migrations.ts";

/**
 * Opens (creating the parent directory if needed), configures and migrates a
 * database. The caller owns the returned connection and must close it.
 */
export function openDb(path: string): DatabaseSync {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  try {
    // busy_timeout first so every later statement waits at most 3 seconds.
    db.exec("PRAGMA busy_timeout = 3000");
    db.exec("PRAGMA journal_mode = WAL");
    runMigrations(db, now().toISOString());
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

let shared: DatabaseSync | undefined;

/** The process-lifetime application connection, opened on first use. */
export function getDb(): DatabaseSync {
  if (!shared) shared = openDb(DATABASE_PATH);
  return shared;
}
