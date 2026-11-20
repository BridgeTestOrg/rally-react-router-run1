import { cities, type City } from "./cities";
import {
  courtsInCity,
  nextOpenSlot,
  type Court,
  type NextOpenSlot,
} from "./courts";
import { getCourtsForCity } from "./courts.server";
import { isoWithOffset } from "./time";
import { verdict, type Verdict } from "./verdict";
import { getWeather, type WeatherDeps } from "./weather.server";

export interface ConditionsEntry {
  city: string;
  state: string;
  available: boolean;
  nextOpen: NextOpenSlot | null;
  tempF: number | null;
  windMph: number | null;
  rainPct: number | null;
  verdict: Verdict | null;
  /**
   * Offset-bearing time in the city's zone: the original fetch time for a
   * success (including cache hits), the caller's attempt time for a failed
   * fetch, and null when there was no slot and nothing was fetched.
   */
  updatedAt: string | null;
}

export interface ConditionsDeps extends WeatherDeps {
  /** Court records to use instead of the bundled dataset. */
  courts?: readonly Court[];
}

function unavailable(
  city: City,
  nextOpen: NextOpenSlot | null,
  updatedAt: string | null,
): ConditionsEntry {
  return {
    city: city.name,
    state: city.state,
    available: false,
    nextOpen,
    tempF: null,
    windMph: null,
    rainPct: null,
    verdict: null,
    updatedAt,
  };
}

async function forCity(
  city: City,
  now: Date,
  deps: ConditionsDeps,
): Promise<ConditionsEntry> {
  const courts = deps.courts
    ? courtsInCity(deps.courts, city)
    : getCourtsForCity(city);
  let nextOpen: NextOpenSlot | null = null;
  try {
    nextOpen = nextOpenSlot(courts, now);
    if (!nextOpen) return unavailable(city, null, null);
    const court = courts.find((c) => c.id === nextOpen!.courtId);
    if (!court) return unavailable(city, nextOpen, isoWithOffset(now, city.timeZone));
    const weather = await getWeather(
      { city, court, slotStart: new Date(nextOpen.time), now },
      deps,
    );
    return {
      city: city.name,
      state: city.state,
      available: true,
      nextOpen,
      tempF: weather.tempF,
      windMph: weather.windMph,
      rainPct: weather.rainPct,
      verdict: verdict(weather),
      updatedAt: weather.updatedAt,
    };
  } catch {
    let attempted: string | null = null;
    try {
      attempted = isoWithOffset(now, city.timeZone);
    } catch {
      // keep null
    }
    return unavailable(city, nextOpen, nextOpen ? attempted : null);
  }
}

/** One entry per launch city, in city order. Never rejects. */
export async function getConditions(
  now: Date,
  deps: ConditionsDeps = {},
): Promise<ConditionsEntry[]> {
  const settled = await Promise.allSettled(
    cities.map((city) => forCity(city, now, deps)),
  );
  return settled.map((result, i) =>
    result.status === "fulfilled"
      ? result.value
      : unavailable(cities[i]!, null, null),
  );
}
