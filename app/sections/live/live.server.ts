import { cities, type City } from "../../lib/cities";
import type { ConditionsEntry } from "../../lib/conditions.server";
import { getConditions } from "../../lib/conditions.server";
import { now } from "../../lib/config.server";
import { content, t } from "../../lib/content";
import { getCourtById } from "../../lib/courts.server";
import type { NextOpenSlot } from "../../lib/courts";
import { formatTime, formatWeekday } from "../../lib/format";
import { addLocalDays, zonedParts } from "../../lib/time";
import type { Route } from "../../routes/+types/home";

export type LivePresentation = "slot" | "noSlot" | "unavailable";
export type LiveVerdictKey = "playable" | "breezy" | "notToday";

/** Plain, serializable view model for one city card. */
export interface LiveCityViewModel {
  key: string;
  city: string;
  state: string;
  heading: string;
  localTime: string;
  presentation: LivePresentation;
  /** Formatted next-open line, or the no-slot wording; null when unavailable. */
  nextOpenText: string | null;
  temp: string | null;
  wind: string | null;
  rain: string | null;
  verdictKey: LiveVerdictKey | null;
  verdictLabel: string | null;
  available: boolean;
  unavailableText: string;
}

export interface LiveViewModel {
  cities: LiveCityViewModel[];
  stampText: string;
  allUnavailable: boolean;
}

export type NextOpenResult =
  | { kind: "slot"; text: string }
  | { kind: "noSlot"; text: string }
  | { kind: "missingCourt" };

/**
 * Formats the next-open line. Uses the explicit request instant and the city's
 * zone; "tomorrow" is the next local calendar date, not now + 24 hours.
 */
export function formatNextOpen(
  nextOpen: NextOpenSlot | null,
  requestNow: Date,
  timeZone: string,
): NextOpenResult {
  const live = content.live;
  if (!nextOpen) return { kind: "noSlot", text: live.noOpenSlot };
  const court = getCourtById(nextOpen.courtId);
  if (!court) return { kind: "missingCourt" };
  const slot = new Date(nextOpen.time);
  const slotDate = zonedParts(slot, timeZone).date;
  const requestDate = zonedParts(requestNow, timeZone).date;
  const time = formatTime(slot, timeZone);
  if (slotDate === requestDate) {
    return { kind: "slot", text: t(live.nextOpen, { court: court.name, time }) };
  }
  if (slotDate === addLocalDays(requestDate, 1)) {
    return {
      kind: "slot",
      text: t(live.nextOpenTomorrow, { court: court.name, time }),
    };
  }
  return {
    kind: "slot",
    text: t(live.nextOpenLater, {
      court: court.name,
      weekday: formatWeekday(slot, timeZone),
      time,
    }),
  };
}

function ms(value: string | null): number | null {
  if (value === null) return null;
  const n = Date.parse(value);
  return Number.isNaN(n) ? null : n;
}

/**
 * Stamp text. Available entries: the oldest non-null timestamp; when every
 * entry is unavailable: the latest non-null failed timestamp. Falls back to the
 * request instant. Elapsed minutes are whole, rounded down, never negative.
 */
export function formatLiveStamp(
  entries: readonly ConditionsEntry[],
  requestNow: Date,
): string {
  const live = content.live;
  const allDown = entries.every((e) => !e.available);
  let chosen: number | null = null;
  if (allDown) {
    for (const e of entries) {
      const v = ms(e.updatedAt);
      if (v !== null && (chosen === null || v > chosen)) chosen = v;
    }
  } else {
    for (const e of entries) {
      if (!e.available) continue;
      const v = ms(e.updatedAt);
      if (v !== null && (chosen === null || v < chosen)) chosen = v;
    }
  }
  const base = chosen ?? requestNow.getTime();
  const minutes = Math.max(0, Math.floor((requestNow.getTime() - base) / 60_000));
  if (allDown) return t(live.stampDown, { minutes });
  if (minutes < 1) return live.stampJustNow;
  return t(live.stamp, { minutes });
}

const VERDICT_KEYS: Record<string, LiveVerdictKey> = {
  playable: "playable",
  breezy: "breezy",
  not_today: "notToday",
};

function cityViewModel(
  city: City,
  entry: ConditionsEntry | undefined,
  requestNow: Date,
): LiveCityViewModel {
  const live = content.live;
  const unavailableText = t(live.cityUnavailable, { city: city.name });
  const base = {
    key: city.id,
    city: city.name,
    state: city.state,
    heading: `${city.name}, ${city.state}`,
    localTime: t(live.localTime, { time: formatTime(requestNow, city.timeZone) }),
    unavailableText,
  };
  const down: LiveCityViewModel = {
    ...base,
    presentation: "unavailable",
    nextOpenText: null,
    temp: null,
    wind: null,
    rain: null,
    verdictKey: null,
    verdictLabel: null,
    available: false,
  };
  if (!entry) return down;

  const next = formatNextOpen(entry.nextOpen, requestNow, city.timeZone);
  if (next.kind === "missingCourt") return down;
  if (next.kind === "noSlot") {
    return { ...down, presentation: "noSlot", nextOpenText: next.text };
  }
  if (
    !entry.available ||
    entry.tempF === null ||
    entry.windMph === null ||
    entry.rainPct === null ||
    entry.verdict === null
  ) {
    return down;
  }
  const verdictKey = VERDICT_KEYS[entry.verdict] ?? "breezy";
  return {
    ...base,
    presentation: "slot",
    nextOpenText: next.text,
    temp: t(live.units.temp, { value: entry.tempF }),
    wind: t(live.units.wind, { value: entry.windMph }),
    rain: t(live.units.rain, { value: entry.rainPct }),
    verdictKey,
    verdictLabel: live.verdicts[verdictKey],
    available: true,
  };
}

/** Builds the serializable live view model; preserves conditions order. */
export function buildLiveViewModel(
  entries: readonly ConditionsEntry[],
  requestNow: Date,
): LiveViewModel {
  const models = cities.map((city, i) => {
    const entry =
      entries.find((e) => e.city === city.name && e.state === city.state) ??
      entries[i];
    return cityViewModel(city, entry, requestNow);
  });
  // A court-lookup failure downgrades only that city; recompute the summary
  // from the effective entries so stamp and notice stay consistent.
  const effective = entries.map((e) => {
    const m = models.find((c) => c.city === e.city && c.state === e.state);
    return m && e.available && !m.available ? { ...e, available: false } : e;
  });
  return {
    cities: models,
    stampText: formatLiveStamp(effective, requestNow),
    allUnavailable: models.every((m) => m.presentation === "unavailable"),
  };
}

/**
 * Streaming loader. Deliberately returns the un-awaited promise so the page
 * does not wait on weather; the router owns it and a rejection is handled by
 * `Await.errorElement` in LiveSection.
 */
export function loadLive(args: Route.LoaderArgs): Promise<LiveViewModel> {
  void args;
  const requestNow = now();
  return getConditions(requestNow).then((entries) =>
    buildLiveViewModel(entries, requestNow),
  );
}
