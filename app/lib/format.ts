/**
 * Zone-aware display formatters. Each takes an instant and an IANA time zone
 * and always formats in that zone, never the process or browser zone.
 *
 * An invalid `Date` or an unknown `timeZone` throws a `RangeError` from `Intl`.
 * There is no fallback date and no read of the current clock.
 */

function parts(
  instant: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): Record<string, string> {
  const formatter = new Intl.DateTimeFormat("en-US", { ...options, timeZone });
  const out: Record<string, string> = {};
  for (const part of formatter.formatToParts(instant)) out[part.type] = part.value;
  return out;
}

function dayPeriod(value: string | undefined): string {
  return (value ?? "").toLowerCase();
}

/** `6:00 pm` */
export function formatTime(instant: Date, timeZone: string): string {
  const p = parts(instant, timeZone, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${p.hour}:${p.minute} ${dayPeriod(p.dayPeriod)}`;
}

/** `10 pm` */
export function formatHour(instant: Date, timeZone: string): string {
  const p = parts(instant, timeZone, { hour: "numeric", hour12: true });
  return `${p.hour} ${dayPeriod(p.dayPeriod)}`;
}

/** `2 Nov` */
export function formatDate(instant: Date, timeZone: string): string {
  const p = parts(instant, timeZone, { day: "numeric", month: "short" });
  return `${p.day} ${p.month}`;
}

/** `Saturday` */
export function formatWeekday(instant: Date, timeZone: string): string {
  return parts(instant, timeZone, { weekday: "long" }).weekday ?? "";
}
