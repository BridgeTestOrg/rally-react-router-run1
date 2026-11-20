import { content } from "../lib/content";
import { SectionHeading } from "./ui";

export function Faq() {
  const { faq } = content;
  return (
    <section id="faq" aria-labelledby="faq-heading" className="section-pad bg-paper">
      <div className="container-page">
        <SectionHeading eyebrow={faq.eyebrow} heading={faq.heading} id="faq-heading" />
        <div className="mt-8 max-w-3xl border-t border-line">
          {faq.items.map((item) => (
            <details key={item.q} className="group border-b border-line">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-4 py-3 text-lead font-semibold text-ink">
                <span>{item.q}</span>
                <span aria-hidden="true" className="relative size-4 shrink-0">
                  <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-court-2" />
                  <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-court-2 group-open:hidden" />
                </span>
              </summary>
              <p className="pb-4 text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
