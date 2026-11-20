import type { DatabaseSync } from "node:sqlite";
import { cities } from "../lib/cities.ts";
import { formatDate } from "../lib/format.ts";
import type { WaitlistInput, WaitlistResult } from "../sections/waitlist/waitlist.types.ts";

function cityById(id: unknown) {
  const city = cities.find((c) => c.id === id);
  if (!city) throw new Error("Unexpected waitlist row: unknown city.");
  return city;
}

/**
 * Stores a signup with one conflict-aware insert (no existence check), so
 * concurrent submissions of one email yield exactly one row. Database errors,
 * including lock timeouts, propagate to the caller.
 */
export function joinWaitlist(
  db: DatabaseSync,
  input: WaitlistInput,
  instant: Date,
): WaitlistResult {
  const email = input.email.trim().toLowerCase();
  const inserted = db
    .prepare(
      `INSERT INTO waitlist (email, city, level, created_at)
VALUES (?, ?, ?, ?)
ON CONFLICT(email) DO NOTHING
RETURNING id`,
    )
    .get(email, input.city, input.level, instant.toISOString());

  if (inserted) {
    const id = inserted.id;
    if (typeof id !== "number") throw new Error("Unexpected insert result.");
    const row = db
      .prepare("SELECT COUNT(*) AS place FROM waitlist WHERE city = ? AND id <= ?")
      .get(input.city, id);
    const place = row?.place;
    if (typeof place !== "number") throw new Error("Unexpected place result.");
    return { kind: "success", place, city: input.city, email };
  }

  const existing = db
    .prepare("SELECT email, city, created_at FROM waitlist WHERE email = ?")
    .get(email);
  if (!existing) throw new Error("Duplicate signup row is missing.");
  const { email: storedEmail, city, created_at: createdAt } = existing;
  if (typeof storedEmail !== "string" || typeof createdAt !== "string") {
    throw new Error("Unexpected waitlist row shape.");
  }
  const storedCity = cityById(city);
  return {
    kind: "duplicate",
    email: storedEmail,
    city: storedCity.id,
    joinedOn: formatDate(new Date(createdAt), storedCity.timeZone),
  };
}
