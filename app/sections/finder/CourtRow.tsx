import { Badge } from "../../components/ui";
import { content, t } from "../../lib/content";
import type { FinderCourtRow } from "./types";

export function CourtRow({ row }: { row: FinderCourtRow }) {
  return (
    <li
      className={`rounded-card border border-line p-4 ${
        row.isClosed ? "bg-neutral-bg/60" : "bg-paper"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg leading-tight font-bold text-ink">
            {row.name}
          </h3>
          <p className="mt-1 text-[14px] text-muted">{row.meta}</p>
        </div>
        <div className="shrink-0">
          {row.isClosed ? (
            <Badge tone="neutral">{content.finder.closedBadge}</Badge>
          ) : (
            <Badge tone="success">
              {t(content.finder.openCount, { count: row.slots.length })}
            </Badge>
          )}
        </div>
      </div>
      <p
        className={`mt-2 text-[14px] font-semibold ${
          row.isClosed ? "text-neutral-text" : "text-success-text"
        }`}
      >
        {row.status}
      </p>
      {row.isClosed ? null : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {row.slots.map((slot) => (
            <li
              key={slot.time}
              className="rounded-input border border-line bg-ground px-3 py-1 text-[14px] text-ink"
            >
              {slot.label}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
