import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { joinWaitlist } from "../waitlist.server";
import { runMigrations } from "../migrations";

function memoryDb() {
  const db = new DatabaseSync(":memory:");
  runMigrations(db, "2026-01-01T00:00:00.000Z");
  return db;
}

describe("runMigrations", () => {
  it("is idempotent", () => {
    const db = memoryDb();
    runMigrations(db, "2026-02-01T00:00:00.000Z");
    expect(db.prepare("SELECT version FROM schema_migrations").all()).toHaveLength(1);
  });
  it("rejects a history with a gap", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)");
    db.exec("INSERT INTO schema_migrations VALUES (2, 'x')");
    expect(() => runMigrations(db, "t")).toThrow();
  });
});

describe("joinWaitlist", () => {
  const at = new Date("2026-03-01T03:00:00Z");
  it("numbers places per city and detects duplicates by stored city", () => {
    const db = memoryDb();
    const a = joinWaitlist(db, { email: " A@x.io ", city: "hoboken", level: "new" }, at);
    expect(a).toEqual({ kind: "success", place: 1, city: "hoboken", email: "a@x.io" });
    const b = joinWaitlist(db, { email: "b@x.io", city: "hoboken", level: "mid" }, at);
    expect(b).toMatchObject({ kind: "success", place: 2 });
    const dup = joinWaitlist(db, { email: "A@X.io", city: "santa-monica", level: "pro" }, at);
    expect(dup).toEqual({ kind: "duplicate", email: "a@x.io", city: "hoboken", joinedOn: "28 Feb" });
  });
});
