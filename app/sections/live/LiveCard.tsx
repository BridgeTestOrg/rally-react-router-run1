import { Badge } from "../../components/ui";
import { content } from "../../lib/content";
import type { Route } from "../../routes/+types/home";

type LiveData = Awaited<Route.ComponentProps["loaderData"]["live"]>;
export type LiveCardData = LiveData["cities"][number];

const TONES = {
  playable: "success",
  breezy: "warning",
  notToday: "neutral",
} as const;

/** Presentational city card; all values are formatted on the server. */
export function LiveCard({ city }: { city: LiveCardData }) {
  const labels = content.live.labels;
  const header = (
    <div>
      <h3 className="text-card-title text-ink">{city.heading}</h3>
      <p className="text-small text-muted mt-1">{city.localTime}</p>
    </div>
  );

  if (city.presentation !== "slot") {
    const noSlot = city.presentation === "noSlot";
    return (
      <article className="live-card" data-state={city.presentation}>
        {header}
        <hr className="live-divider" />
        <p className="text-small text-ink">
          {noSlot ? city.nextOpenText : city.unavailableText}
        </p>
        {noSlot ? null : (
          <p className="text-small text-muted">
            {content.live.cityUnavailableNote}
          </p>
        )}
      </article>
    );
  }

  const stats = [
    { label: labels.temp, value: city.temp },
    { label: labels.wind, value: city.wind },
    { label: labels.rain, value: city.rain },
  ];
  return (
    <article className="live-card" data-state="slot">
      {header}
      {city.verdictKey && city.verdictLabel ? (
        <div className="mt-3">
          <Badge tone={TONES[city.verdictKey]}>{city.verdictLabel}</Badge>
        </div>
      ) : null}
      <dl className="live-stats">
        {stats.map((s) => (
          <div key={s.label}>
            <dd className="text-card-title text-ink">{s.value}</dd>
            <dt className="text-small text-muted">{s.label}</dt>
          </div>
        ))}
      </dl>
      <p className="text-small text-court-2 font-semibold">{city.nextOpenText}</p>
    </article>
  );
}
