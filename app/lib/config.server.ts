/**
 * The only module that reads `WEATHER_URL`, `RALLY_NOW` and `DATABASE_PATH`,
 * and the only source of the application's current time. Server-only: never
 * import it from components or return its values in loader data.
 *
 * Blank (empty or whitespace-only) settings count as unset and get defaults.
 * Nonblank invalid settings throw a configuration error that names the
 * setting but never echoes its value.
 */

function setting(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function parseWeatherUrl(): string {
  const raw = setting("WEATHER_URL");
  if (raw === undefined) return "https://api.weather.gov";
  try {
    const url = new URL(raw);
    if (url.protocol === "http:" || url.protocol === "https:") return raw;
  } catch {
    // fall through to the configuration error
  }
  throw new Error("Invalid WEATHER_URL: expected an absolute http(s) URL.");
}

const ISO_WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/i;

function parseRallyNow(): number | undefined {
  const raw = setting("RALLY_NOW");
  if (raw === undefined) return undefined;
  const ms = ISO_WITH_OFFSET.test(raw) ? Date.parse(raw) : Number.NaN;
  if (Number.isNaN(ms)) {
    throw new Error(
      "Invalid RALLY_NOW: expected an ISO instant with an explicit UTC offset or Z.",
    );
  }
  return ms;
}

export const WEATHER_URL: string = parseWeatherUrl();
export const DATABASE_PATH: string = setting("DATABASE_PATH") ?? "data/rally.db";

const frozenMs = parseRallyNow();

/** The current instant: `RALLY_NOW` when set, otherwise the real clock. */
export function now(): Date {
  return new Date(frozenMs ?? Date.now());
}
