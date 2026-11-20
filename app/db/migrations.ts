import type { DatabaseSync } from "node:sqlite";

type Migration = { version: number; sql: string };

/** Ordered and contiguous from version 1. Never edit a released migration. */
const migrations: readonly Migration[] = [
  {
    version: 1,
    sql: `CREATE TABLE waitlist (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  level TEXT NOT NULL,
  created_at TEXT NOT NULL
)`,
  },
];

/**
 * Applies pending migrations in one transaction. `BEGIN IMMEDIATE` is taken
 * before history is read, so concurrent callers serialize and a migration is
 * never applied twice. Running again with a complete supported history applies
 * nothing. Any failure rolls everything back and rethrows the original error.
 */
export function runMigrations(db: DatabaseSync, appliedAt: string): void {
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec(
      "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)",
    );
    const rows = db
      .prepare("SELECT version FROM schema_migrations ORDER BY version")
      .all();
    let applied = 0;
    for (const row of rows) {
      const version = row.version;
      if (typeof version !== "number" || !Number.isInteger(version)) {
        throw new Error("Invalid migration history: malformed version.");
      }
      if (version > migrations.length) {
        throw new Error("Invalid migration history: unknown newer version.");
      }
      if (version !== applied + 1) {
        throw new Error("Invalid migration history: versions are not contiguous.");
      }
      applied = version;
    }
    const insert = db.prepare(
      "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
    );
    for (const migration of migrations.slice(applied)) {
      db.exec(migration.sql);
      insert.run(migration.version, appliedAt);
    }
    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // The original error is the one worth reporting.
    }
    throw error;
  }
}
