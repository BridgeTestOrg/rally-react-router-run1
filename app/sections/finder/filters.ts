import { parseCourtFilters, type CourtFilters } from "../../lib/courts";

export type {
  CourtFilters,
  DayFilter,
  StateFilter,
  TimeFilter,
} from "../../lib/courts";

/**
 * Finder filter parsing: a thin adapter over the shared `parseCourtFilters`,
 * which stays the single authority on allowed values.
 *
 * Finder-specific validation exception: absent, empty, and malformed optional
 * fields each default independently. There is no 4xx response and no redirect.
 * URL `state=` (empty) resolves to the internal `"all"`, and the lights and
 * parking checkboxes are enabled only by the exact value `"1"`.
 */
export const DEFAULT_FILTERS: Readonly<CourtFilters> = Object.freeze(
  parseCourtFilters(new URLSearchParams()),
);

export function parseFinderFilters(searchParams: URLSearchParams): CourtFilters {
  return parseCourtFilters(searchParams);
}
