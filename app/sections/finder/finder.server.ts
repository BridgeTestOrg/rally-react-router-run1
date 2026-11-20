import { now } from "../../lib/config.server";
import { content, t } from "../../lib/content";
import { closureOn, courtStatus, resolveCourtDay } from "../../lib/courts";
import { getCourtById, listCourts } from "../../lib/courts.server";
import { formatTime } from "../../lib/format";
import { zonedInstant, zonedParts } from "../../lib/time";
import type { Route } from "../../routes/+types/home";
import { parseFinderFilters, type CourtFilters } from "./filters";
import type { FinderCourtRow } from "./types";

export interface FinderData {
  filters: CourtFilters;
  rows: FinderCourtRow[];
  openCount: number;
  day: CourtFilters["day"];
}

/** Resolves the court finder for the request's URL filters. Server-only. */
export function loadFinder(args: Route.LoaderArgs): FinderData {
  const filters = parseFinderFilters(new URL(args.request.url).searchParams);
  const requestNow = now();
  const f = content.finder;
  const rows: FinderCourtRow[] = [];

  for (const candidate of listCourts(filters, requestNow)) {
    const court = getCourtById(candidate.id);
    if (!court) continue; // internal dataset inconsistency: skip, never crash

    const date = resolveCourtDay(filters.day, requestNow, candidate.timezone);
    const local = zonedParts(requestNow, court.timezone);
    const isClosed =
      closureOn(court, date) !== undefined ||
      (date === local.date && local.time >= court.hours.close);

    const apiSlots = candidate.slots[filters.day];
    if (!isClosed && apiSlots.length === 0) continue;

    let meta = t(f.meta, {
      city: court.city,
      state: court.state,
      courts: court.courts,
    });
    if (court.lights) meta += f.metaLights;
    if (court.parking) meta += f.metaParking;

    rows.push({
      id: court.id,
      name: court.name,
      meta,
      status: courtStatus(court, date, requestNow),
      isClosed,
      slots: isClosed
        ? []
        : apiSlots.map((time) => ({
            time,
            label: formatTime(zonedInstant(date, time, court.timezone), court.timezone),
          })),
    });
  }

  return {
    filters,
    rows,
    openCount: rows.filter((r) => !r.isClosed).length,
    day: filters.day,
  };
}
