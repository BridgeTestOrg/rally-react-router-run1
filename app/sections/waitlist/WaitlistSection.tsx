import { useActionData } from "react-router";
import { SectionHeading } from "../../components/ui";
import { content } from "../../lib/content";
import { WaitlistForm } from "./WaitlistForm";
import { WaitlistResult } from "./WaitlistResult";
import type { WaitlistActionData } from "./waitlist.types";

/** Contract: keep `id="waitlist"` and the heading's place in the section. */
export function WaitlistSection(props: { data?: WaitlistActionData | null }) {
  const actionData = useActionData<WaitlistActionData | null>();
  const data = actionData ?? props.data ?? null;

  return (
    <section id="waitlist" aria-labelledby="waitlist-heading" className="section-pad bg-court">
      <div className="container-page grid min-w-0 grid-cols-1 gap-10 stack:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] stack:items-start">
        <div className="min-w-0">
          <SectionHeading
            eyebrow={content.waitlist.eyebrow}
            heading={content.waitlist.heading}
            id="waitlist-heading"
            surface="dark"
          />
          <p className="text-lead mt-4 text-on-court-strong">{content.waitlist.lead}</p>
          <ul className="mt-6 grid gap-3">
            {content.waitlist.perks.map((perk) => (
              <li key={perk} className="flex items-start gap-3 text-white">
                <span
                  aria-hidden="true"
                  className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-pill bg-ball text-sm font-bold text-ball-ink"
                >
                  ✓
                </span>
                <span className="min-w-0">{perk}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0 rounded-card bg-white p-7 text-ink">
          <div role="status" aria-live="polite" aria-atomic="true" className="min-w-0">
            {data && "kind" in data ? (
              <WaitlistResult result={data} />
            ) : (
              <WaitlistForm errors={data?.errors} values={data?.values} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
