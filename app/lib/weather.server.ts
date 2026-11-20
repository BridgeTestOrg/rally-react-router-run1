import type { City, CityId } from "./cities";
import { WEATHER_URL } from "./config.server";
import type { Court } from "./courts";
import { isoWithOffset } from "./time";

/**
 * NWS weather retrieval. Server-only.
 *
 * Standards exception (documented in README): this module keeps a bounded
 * process-local success cache (one entry per launch city) and an in-flight
 * registry (at most a handful of entries, removed on completion). Nothing
 * request- or response-specific lives in module scope.
 */

const USER_AGENT = "Rally test app (hello@example.com)";
const DEFAULT_TIMEOUT_MS = 3000;
const CACHE_TTL_MS = 10 * 60 * 1000;

export interface WeatherDeps {
  fetch?: typeof fetch;
  /** Budget for the whole points + forecast operation. Default 3000 ms. */
  timeoutMs?: number;
}

export interface WeatherRequest {
  city: City;
  court: Court;
  /** Start instant of the target slot. */
  slotStart: Date;
  /** Request time; the only clock this module uses. */
  now: Date;
}

export interface WeatherSuccess {
  tempF: number;
  windMph: number;
  rainPct: number;
  /** Fetch time as offset-bearing ISO in the city's zone. */
  updatedAt: string;
}

export class WeatherError extends Error {
  constructor(readonly kind: "timeout" | "upstream" | "reset") {
    super(`Weather unavailable (${kind}).`);
    this.name = "WeatherError";
  }
}

interface ParsedWeather {
  tempF: number;
  windMph: number;
  rainPct: number;
  intervalStart: number;
  intervalEnd: number;
}

interface CacheEntry extends ParsedWeather {
  courtId: string;
  fetchedAtMs: number;
  updatedAt: string;
  seq: number;
}

interface InFlight {
  promise: Promise<WeatherSuccess>;
  controller: AbortController;
}

const cache = new Map<CityId, CacheEntry>();
const inFlight = new Map<string, InFlight>();
let sequence = 0;
let epoch = 0;

/** Clears successes, cancels active operations, and invalidates late results. */
export function resetWeatherCache(): void {
  epoch++;
  cache.clear();
  for (const op of inFlight.values()) op.controller.abort();
  inFlight.clear();
}

// ---- parsing -------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(): never {
  throw new WeatherError("upstream");
}

function finite(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fail();
}

const WIND_RE = /^\s*(\d+(?:\.\d+)?)(?:\s*to\s*(\d+(?:\.\d+)?))?\s*mph\s*$/i;

function parseWind(value: unknown): number {
  if (typeof value !== "string") return fail();
  const m = WIND_RE.exec(value);
  if (!m) return fail();
  const upper = Number(m[2] ?? m[1]);
  return Number.isFinite(upper) ? upper : fail();
}

function parseTime(value: unknown): number {
  if (typeof value !== "string") return fail();
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? fail() : ms;
}

function parseForecast(body: unknown, slotMs: number): ParsedWeather {
  if (!isRecord(body) || !isRecord(body.properties)) return fail();
  const periods = body.properties.periods;
  if (!Array.isArray(periods)) return fail();
  for (const period of periods) {
    if (!isRecord(period)) continue;
    const start = Date.parse(String(period.startTime));
    const end = Date.parse(String(period.endTime));
    if (Number.isNaN(start) || Number.isNaN(end) || !(start <= slotMs && slotMs < end)) {
      continue;
    }
    if (period.temperatureUnit !== "F") return fail();
    const precip = period.probabilityOfPrecipitation;
    if (!isRecord(precip) || !("value" in precip)) return fail();
    return {
      tempF: finite(period.temperature),
      windMph: parseWind(period.windSpeed),
      rainPct: precip.value === null ? 0 : finite(precip.value),
      intervalStart: parseTime(period.startTime),
      intervalEnd: parseTime(period.endTime),
    };
  }
  return fail();
}

// ---- network pipeline ----------------------------------------------------

async function getJson(
  fetchImpl: typeof fetch,
  url: string,
  signal: AbortSignal,
): Promise<unknown> {
  signal.throwIfAborted();
  const response = await fetchImpl(url, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "manual",
    signal,
  });
  if (!response.ok || response.status >= 300) return fail();
  const json: unknown = await response.json();
  signal.throwIfAborted();
  return json;
}

function forecastUrl(points: unknown): string {
  if (!isRecord(points) || !isRecord(points.properties)) return fail();
  const raw = points.properties.forecastHourly;
  if (typeof raw !== "string") return fail();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return fail();
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return fail();
  if (url.origin !== new URL(WEATHER_URL).origin) return fail();
  return url.toString();
}

async function pipeline(
  court: Court,
  slotMs: number,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<ParsedWeather> {
  const base = WEATHER_URL.replace(/\/+$/, "");
  const points = await getJson(
    fetchImpl,
    `${base}/points/${court.lat},${court.lon}`,
    signal,
  );
  signal.throwIfAborted();
  const hourly = await getJson(fetchImpl, forecastUrl(points), signal);
  signal.throwIfAborted();
  return parseForecast(hourly, slotMs);
}

// ---- cache + de-duplication ------------------------------------------------

function reusable(entry: CacheEntry | undefined, req: WeatherRequest): entry is CacheEntry {
  if (!entry || entry.courtId !== req.court.id) return false;
  const age = req.now.getTime() - entry.fetchedAtMs;
  const slot = req.slotStart.getTime();
  return (
    age >= 0 &&
    age < CACHE_TTL_MS &&
    entry.intervalStart <= slot &&
    slot < entry.intervalEnd
  );
}

function toSuccess(entry: CacheEntry): WeatherSuccess {
  return {
    tempF: entry.tempF,
    windMph: entry.windMph,
    rainPct: entry.rainPct,
    updatedAt: entry.updatedAt,
  };
}

function run(req: WeatherRequest, deps: WeatherDeps, key: string): InFlight {
  const fetchImpl = deps.fetch ?? fetch;
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const signal = AbortSignal.any([AbortSignal.timeout(timeoutMs), controller.signal]);
  const seq = ++sequence;
  const opEpoch = epoch;
  const slotMs = req.slotStart.getTime();

  let entry: InFlight | undefined;
  const promise = (async () => {
      let onAbort: (() => void) | undefined;
      const aborted = new Promise<never>((_, reject) => {
        onAbort = () =>
          reject(new WeatherError(opEpoch !== epoch ? "reset" : "timeout"));
        if (signal.aborted) onAbort();
        else signal.addEventListener("abort", onAbort, { once: true });
      });
      const work = pipeline(req.court, slotMs, fetchImpl, signal);
      work.catch(() => {}); // a late rejection must never be unhandled
      try {
        const parsed = await Promise.race([work, aborted]);
        if (signal.aborted || opEpoch !== epoch) throw new WeatherError("timeout");
        // Cache writes happen here, outside the network pipeline.
        const cached = cache.get(req.city.id);
        const record: CacheEntry = {
          ...parsed,
          courtId: req.court.id,
          fetchedAtMs: req.now.getTime(),
          updatedAt: isoWithOffset(req.now, req.city.timeZone),
          seq,
        };
        if (!cached || cached.seq < seq) cache.set(req.city.id, record);
        return toSuccess(record);
      } catch (error) {
        throw error instanceof WeatherError ? error : new WeatherError("upstream");
      } finally {
        if (onAbort) signal.removeEventListener("abort", onAbort);
        if (inFlight.get(key) === entry) inFlight.delete(key);
      }
  })();
  entry = { controller, promise };
  inFlight.set(key, entry);
  return entry;
}

/**
 * Weather for the target slot. Rejects with `WeatherError` (never leaking
 * upstream bodies, URLs or messages) on timeout, redirect, or bad payloads.
 */
export function getWeather(
  req: WeatherRequest,
  deps: WeatherDeps = {},
): Promise<WeatherSuccess> {
  const cached = cache.get(req.city.id);
  if (reusable(cached, req)) return Promise.resolve(toSuccess(cached));
  const key = `${req.city.id}|${req.court.id}|${req.slotStart.getTime()}`;
  const existing = inFlight.get(key);
  if (existing) return existing.promise;
  return run(req, deps, key).promise;
}
