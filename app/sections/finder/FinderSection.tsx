import { Link } from "react-router";
import { Button, SectionHeading } from "../../components/ui";
import { content, t } from "../../lib/content";
import { CourtRow } from "./CourtRow";
import { FilterForm } from "./FilterForm";
import type { loadFinder } from "./finder.server";

export function FinderSection({
  data,
}: {
  data: Awaited<ReturnType<typeof loadFinder>>;
}) {
  const f = content.finder;
  const template =
    data.openCount === 0 ? f.countNone : data.openCount === 1 ? f.countOne : f.countMany;
  const count = t(template, { count: data.openCount, day: f.dayPhrases[data.day] });

  return (
    <section id="courts" aria-labelledby="courts-heading" className="section-pad bg-paper">
      <div className="container-page">
        <SectionHeading eyebrow={f.eyebrow} heading={f.heading} id="courts-heading" />
        <div className="mt-8 grid gap-6 wide:grid-cols-[360px_minmax(0,1fr)] wide:gap-7">
          <div className="min-w-0">
            <FilterForm filters={data.filters} />
          </div>
          <div className="min-w-0" aria-live="polite">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="font-display text-lg font-bold text-ink">{count}</p>
              <Link
                to="/#courts"
                className="inline-flex min-h-11 items-center text-[14px] font-semibold text-court underline"
              >
                {f.clear}
              </Link>
            </div>
            <p className="mt-1 text-[14px] text-muted">{f.localNote}</p>
            {data.rows.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {data.rows.map((row) => (
                  <CourtRow key={row.id} row={row} />
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded-card border border-dashed border-line p-8 text-center">
                <p className="font-display text-lg font-bold text-ink">{f.emptyTitle}</p>
                <p className="mt-2 text-[14px] text-muted">{f.emptyBody}</p>
                <Button to="/#courts" variant="court" className="mt-4">
                  {f.clear}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
