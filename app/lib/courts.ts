import type { City } from "./cities";
import { content, t } from "./content";
import { formatHour, formatWeekday } from "./format";
import {
  addLocalDays,
  isoWithOffset,
  weekdayOf,
  zonedInstant,
  zonedParts,
  type WeekdayKey,
} from "./time";

export type { WeekdayKey } from "./time";

export type LocalDate = string; // YYYY-MM-DD
export type LocalTime = string; // HH:MM, 24-hour

export interface OpeningRange {
  readonly open: LocalTime;
  readonly close: LocalTime;
}

export interface Closure {
  readonly date: LocalDate;
  readonly reason: string;
}

export interface CourtRecord {
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly state: string;
  readonly timezone: string;
  readonly lat: number;
  readonly lon: number;
  readonly courts: number;
  readonly lights: boolean;
  readonly parking: boolean;
  readonly slots: Readonly<Record<WeekdayKey, readonly LocalTime[]>>;
  readonly closures: readonly Closure[];
}

export interface CourtDataset {
  readonly openingHours: {
    readonly withLights: OpeningRange;
    readonly withoutLights: OpeningRange;
  };
  readonly courts: readonly CourtRecord[];
}

/** A source record plus its resolved opening-hour range. */
export interface Court extends CourtRecord {
  readonly hours: OpeningRange;
}

export type StateFilter = "all" | "CO" | "CA" | "NJ";
export type DayFilter = "today" | "tomorrow" | "sat";
export type TimeFilter = "any" | "am" | "pm" | "eve";

export interface CourtFilters {
  state: StateFilter;
  day: DayFilter;
  time: TimeFilter;
  lights: boolean;
  parking: boolean;
}

export interface NextOpenSlot {
  courtId: string;
  /** Offset-bearing ISO time in the court's zone. */
  time: string;
}

export interface CourtRow {
  id: string;
  name: string;
  city: string;
  state: string;
  timezone: string;
  courts: number;
  lights: boolean;
  parking: boolean;
  openNow: boolean;
  status: string;
  closedReason: string | null;
  slots: { today: string[]; tomorrow: string[]; sat: string[] };
}

const STATES: readonly StateFilter[] = ["all", "CO", "CA", "NJ"];
const DAYS: readonly DayFilter[] = ["today", "tomorrow", "sat"];
const TIMES: readonly TimeFilter[] = ["any", "am", "pm", "eve"];

function pick<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.find((candidate) => candidate === value) ?? fallback;
}

/** Validates filter query values; anything missing or unknown defaults. */
export function parseCourtFilters(searchParams: URLSearchParams): CourtFilters {
  return {
    state: pick(searchParams.get("state"), STATES, "all"),
    day: pick(searchParams.get("day"), DAYS, "today"),
    time: pick(searchParams.get("time"), TIMES, "any"),
    lights: searchParams.get("lights") === "1",
    parking: searchParams.get("parking") === "1",
  };
}

/** True when the filters are the normalized all-default selection. */
export function isDefaultFilters(f: CourtFilters): boolean {
  return (
    f.state === "all" &&
    f.day === "today" &&
    f.time === "any" &&
    !f.lights &&
    !f.parking
  );
}

/** Courts whose city name, state and zone match the given launch city. */
export function courtsInCity(
  courts: readonly Court[],
  city: City,
): readonly Court[] {
  return courts.filter(
    (c) =>
      c.city === city.name && c.state === city.state && c.timezone === city.timeZone,
  );
}

/** The closure covering a local date, if any. */
export function closureOn(court: CourtRecord, localDate: LocalDate): Closure | undefined {
  return court.closures.find((closure) => closure.date === localDate);
}

/** Whether the court is open at `now`: not closed all day and `open <= t < close`. */
export function openNow(court: Court, now: Date): boolean {
  const local = zonedParts(now, court.timezone);
  if (closureOn(court, local.date)) return false;
  return court.hours.open <= local.time && local.time < court.hours.close;
}

/** Resolves a day filter to a local date in `timeZone`. */
export function resolveCourtDay(
  day: DayFilter,
  now: Date,
  timeZone: string,
): LocalDate {
  const today = zonedParts(now, timeZone);
  if (day === "today") return today.date;
  if (day === "tomorrow") return addLocalDays(today.date, 1);
  const order: readonly WeekdayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const ahead = (order.indexOf("sat") - order.indexOf(today.weekday) + 7) % 7;
  return addLocalDays(today.date, ahead);
}

/** Whether a slot start falls inside the time window. */
export function inTimeWindow(slot: LocalTime, window: TimeFilter): boolean {
  switch (window) {
    case "am":
      return slot < "12:00";
    case "pm":
      return slot >= "12:00" && slot < "17:00";
    case "eve":
      return slot >= "17:00";
    default:
      return true;
  }
}

/** Open slot starts on `localDate`, honoring closures, the window and "now". */
export function slotsForDate(
  court: Court,
  localDate: LocalDate,
  now: Date,
  timeWindow: TimeFilter,
): string[] {
  if (closureOn(court, localDate)) return [];
  const local = zonedParts(now, court.timezone);
  return court.slots[weekdayOf(localDate)].filter(
    (slot) =>
      inTimeWindow(slot, timeWindow) &&
      (localDate !== local.date || slot > local.time),
  );
}

/** Status text for `localDate`, built from the bundled content templates. */
export function courtStatus(court: Court, localDate: LocalDate, now: Date): string {
  const f = content.finder;
  const tz = court.timezone;
  const closure = closureOn(court, localDate);
  if (closure) {
    return t(f.statusClosure, {
      dayName: formatWeekday(zonedInstant(localDate, "12:00", tz), tz),
      reason: closure.reason,
    });
  }
  if (localDate === zonedParts(now, tz).date) {
    if (openNow(court, now)) {
      return t(f.statusOpenUntil, {
        time: formatHour(zonedInstant(localDate, court.hours.close, tz), tz),
      });
    }
    return f.statusClosedNow;
  }
  return court.lights ? f.statusHoursWithLights : f.statusHoursWithoutLights;
}

/** Earliest slot strictly after `now`, looking at today and the next 7 local dates. */
export function nextOpenSlot(
  courts: readonly Court[],
  now: Date,
): NextOpenSlot | null {
  let best: { ms: number; slot: NextOpenSlot } | null = null;
  for (const court of courts) {
    const today = zonedParts(now, court.timezone).date;
    for (let offset = 0; offset <= 7; offset++) {
      const date = addLocalDays(today, offset);
      if (closureOn(court, date)) continue;
      for (const start of court.slots[weekdayOf(date)]) {
        let instant: Date;
        try {
          instant = zonedInstant(date, start, court.timezone);
        } catch {
          continue; // slot falls in a nonexistent DST wall time
        }
        const ms = instant.getTime();
        if (ms <= now.getTime()) continue;
        if (best === null || ms < best.ms) {
          best = {
            ms,
            slot: { courtId: court.id, time: isoWithOffset(instant, court.timezone) },
          };
        }
      }
    }
  }
  return best ? best.slot : null;
}
