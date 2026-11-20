/**
 * Clock-free local-time primitives. Every function takes an explicit instant
 * or local date and an IANA time zone; none reads the environment, the clock,
 * or the host's local time zone.
 *
 * DST disambiguation (deterministic): a wall time that occurs twice (clocks
 * going back) resolves to the earlier instant; a wall time that does not exist
 * (clocks going forward) is rejected with a `RangeError` rather than silently
 * normalized.
 */

export type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface ZonedParts {
  /** Local `YYYY-MM-DD`. */
  date: string;
  weekday: WeekdayKey;
  /** Local zero-padded 24-hour `HH:MM`. */
  time: string;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;
const WEEKDAYS: readonly WeekdayKey[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      calendar: "gregory",
      numberingSystem: "latn",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

interface Fields {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: WeekdayKey;
}

function fields(instant: Date, timeZone: string): Fields {
  const out: Record<string, string> = {};
  for (const part of formatterFor(timeZone).formatToParts(instant)) {
    out[part.type] = part.value;
  }
  const hour = Number(out.hour) % 24; // some engines render midnight as 24
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour,
    minute: Number(out.minute),
    second: Number(out.second),
    weekday: (out.weekday ?? "").slice(0, 3).toLowerCase() as WeekdayKey,
  };
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** Local date, weekday and time of `instant` in `timeZone`. */
export function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const f = fields(instant, timeZone);
  return {
    date: `${pad(f.year, 4)}-${pad(f.month)}-${pad(f.day)}`,
    weekday: f.weekday,
    time: `${pad(f.hour)}:${pad(f.minute)}`,
  };
}

function parseDate(localDate: string): [number, number, number] {
  const m = DATE_RE.exec(localDate);
  if (!m) throw new RangeError("Invalid local date: expected YYYY-MM-DD.");
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== mo - 1 ||
    check.getUTCDate() !== d
  ) {
    throw new RangeError("Invalid local date: no such calendar day.");
  }
  return [y, mo, d];
}

function parseTime(localTime: string): [number, number] {
  const m = TIME_RE.exec(localTime);
  const h = m ? Number(m[1]) : Number.NaN;
  const min = m ? Number(m[2]) : Number.NaN;
  if (!m || h > 23 || min > 59) {
    throw new RangeError("Invalid local time: expected HH:MM.");
  }
  return [h, min];
}

/** Weekday of a local calendar date (zone-independent). */
export function weekdayOf(localDate: string): WeekdayKey {
  const [y, mo, d] = parseDate(localDate);
  return WEEKDAYS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()]!;
}

/** Adds whole calendar days to a local date using UTC calendar arithmetic. */
export function addLocalDays(localDate: string, days: number): string {
  const [y, mo, d] = parseDate(localDate);
  if (!Number.isInteger(days)) throw new RangeError("days must be an integer.");
  const shifted = new Date(Date.UTC(y, mo - 1, d + days));
  return `${pad(shifted.getUTCFullYear(), 4)}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** Offset of `timeZone` from UTC at `instant`, in milliseconds. */
function offsetMs(instant: Date, timeZone: string): number {
  const f = fields(instant, timeZone);
  const asUtc = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The instant at which `timeZone`'s wall clock reads `localDate` `localTime`. */
export function zonedInstant(
  localDate: string,
  localTime: string,
  timeZone: string,
): Date {
  const [y, mo, d] = parseDate(localDate);
  const [h, min] = parseTime(localTime);
  const guess = Date.UTC(y, mo - 1, d, h, min);
  const offsets = new Set([
    offsetMs(new Date(guess - 86_400_000), timeZone),
    offsetMs(new Date(guess + 86_400_000), timeZone),
  ]);
  const matches: number[] = [];
  for (const offset of offsets) {
    const candidate = new Date(guess - offset);
    const parts = zonedParts(candidate, timeZone);
    if (parts.date === localDate && parts.time === localTime) {
      matches.push(candidate.getTime());
    }
  }
  if (matches.length === 0) {
    throw new RangeError("Nonexistent local time in the given time zone.");
  }
  return new Date(Math.min(...matches));
}

/** `YYYY-MM-DDTHH:MM:SS±HH:MM` with the zone's offset at `instant`. */
export function isoWithOffset(instant: Date, timeZone: string): string {
  const f = fields(instant, timeZone);
  const offset = offsetMs(instant, timeZone) / 60_000;
  const sign = offset < 0 ? "-" : "+";
  const abs = Math.abs(offset);
  return (
    `${pad(f.year, 4)}-${pad(f.month)}-${pad(f.day)}` +
    `T${pad(f.hour)}:${pad(f.minute)}:${pad(f.second)}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}
