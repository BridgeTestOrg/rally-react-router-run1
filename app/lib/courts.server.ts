import type { City } from "./cities";
import data from "../../data/courts.json";
import {
  closureOn,
  courtStatus,
  courtsInCity,
  isDefaultFilters,
  openNow,
  resolveCourtDay,
  slotsForDate,
  type Court,
  type CourtDataset,
  type CourtFilters,
  type CourtRow,
} from "./courts";
import { zonedParts } from "./time";

/** Server-only: the bundled court dataset, normalized with opening hours. */
const dataset: CourtDataset = data;

const allCourts: readonly Court[] = dataset.courts.map((record) => ({
  ...record,
  hours: record.lights
    ? dataset.openingHours.withLights
    : dataset.openingHours.withoutLights,
}));

const byId: ReadonlyMap<string, Court> = new Map(allCourts.map((c) => [c.id, c]));

export function getCourtById(id: string): Court | undefined {
  return byId.get(id);
}

export function getCourtsForCity(city: City): readonly Court[] {
  return courtsInCity(allCourts, city);
}

function row(court: Court, filters: CourtFilters, now: Date): CourtRow {
  const today = zonedParts(now, court.timezone).date;
  const slotsFor = (day: "today" | "tomorrow" | "sat") =>
    slotsForDate(court, resolveCourtDay(day, now, court.timezone), now, filters.time);
  return {
    id: court.id,
    name: court.name,
    city: court.city,
    state: court.state,
    timezone: court.timezone,
    courts: court.courts,
    lights: court.lights,
    parking: court.parking,
    openNow: openNow(court, now),
    status: courtStatus(court, today, now),
    closedReason: closureOn(court, today)?.reason ?? null,
    slots: {
      today: slotsFor("today"),
      tomorrow: slotsFor("tomorrow"),
      sat: slotsFor("sat"),
    },
  };
}

/** Whether the selected day is a case where a court stays listed as Closed. */
function retainedAsClosed(court: Court, date: string, now: Date): boolean {
  if (closureOn(court, date)) return true;
  const local = zonedParts(now, court.timezone);
  return date === local.date && local.time >= court.hours.close;
}

export function listCourts(filters: CourtFilters, now: Date): CourtRow[] {
  const unfiltered = isDefaultFilters(filters);
  const rows: CourtRow[] = [];
  for (const court of allCourts) {
    if (filters.state !== "all" && court.state !== filters.state) continue;
    if (filters.lights && !court.lights) continue;
    if (filters.parking && !court.parking) continue;
    if (!unfiltered) {
      const date = resolveCourtDay(filters.day, now, court.timezone);
      const hasSlot = slotsForDate(court, date, now, filters.time).length > 0;
      if (!hasSlot && !retainedAsClosed(court, date, now)) continue;
    }
    rows.push(row(court, filters, now));
  }
  return rows;
}
