import { data } from "react-router";
import { getDb } from "../../db/db.server.ts";
import { joinWaitlist } from "../../db/waitlist.server.ts";
import { cities } from "../../lib/cities.ts";
import { now } from "../../lib/config.server.ts";
import { content } from "../../lib/content.ts";
import type { Route } from "../../routes/+types/home";
import type { WaitlistErrors, WaitlistInput, WaitlistLevel } from "./waitlist.types.ts";

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LEVELS: readonly WaitlistLevel[] = ["new", "mid", "pro"];
const headers = { "Cache-Control": "no-store" };

function text(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" ? value : null;
}

/** Validates a waitlist submission and stores it. Other intents return null. */
export async function waitlistAction(args: Route.ActionArgs) {
  const form = await args.request.formData();
  if (text(form.get("intent")) !== "waitlist") return null;

  const email = text(form.get("email"));
  const city = text(form.get("city"));
  const level = text(form.get("level"));
  const values = { email: email ?? "", city: city ?? "", level: level ?? "" };

  const errors: WaitlistErrors = {};
  const normalized = values.email.trim().toLowerCase();
  if (email === null || !EMAIL_SHAPE.test(normalized)) {
    errors.email = content.waitlist.errors.email;
  }
  const cityMatch = cities.find((c) => c.id === city);
  if (!cityMatch) errors.city = content.waitlist.errors.city;
  const levelMatch = LEVELS.find((l) => l === level);
  if (!levelMatch) errors.level = content.waitlist.errors.level;

  if (errors.email || !cityMatch || !levelMatch) {
    return data({ errors, values }, { status: 400, headers });
  }

  const input: WaitlistInput = { email: normalized, city: cityMatch.id, level: levelMatch };
  try {
    const result = joinWaitlist(getDb(), input, now());
    return data(result, { status: 200, headers });
  } catch {
    // Details stay server-side; never log submitted values.
    return data(
      { errors: { form: content.waitlist.errors.server }, values },
      { status: 500, headers },
    );
  }
}
