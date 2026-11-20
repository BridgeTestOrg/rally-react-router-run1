export type Verdict = "not_today" | "playable" | "breezy";

export interface VerdictInput {
  tempF: number;
  windMph: number;
  rainPct: number;
}

/** Weather verdict; the `not_today` rejection rule takes precedence. */
export function verdict({ tempF, windMph, rainPct }: VerdictInput): Verdict {
  if (windMph >= 18 || rainPct >= 60 || tempF < 40) return "not_today";
  if (windMph < 12 && rainPct < 30) return "playable";
  return "breezy";
}
