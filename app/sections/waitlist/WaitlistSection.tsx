import { SectionHeading } from "../../components/ui";
import { content } from "../../lib/content";
import type { Route } from "../../routes/+types/home";

/**
 * Heading-only shell. Contract for later tickets: keep `id="waitlist"` and the
 * heading's place in the section; the data type and section body may change.
 */
export function WaitlistSection(props: {
  data: Route.ComponentProps["actionData"];
}) {
  void props;
  return (
    <section id="waitlist" aria-labelledby="waitlist-heading" className="section-pad bg-court">
      <div className="container-page">
        <SectionHeading
          eyebrow={content.waitlist.eyebrow}
          heading={content.waitlist.heading}
          id="waitlist-heading"
          surface="dark"
        />
      </div>
    </section>
  );
}
