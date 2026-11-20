import { SectionHeading } from "../../components/ui";
import { content } from "../../lib/content";
import type { Route } from "../../routes/+types/home";

/**
 * Heading-only shell. Contract for later tickets: keep `id="live"` and the
 * heading's place in the section; the data type and section body may change.
 */
export function LiveSection(props: {
  data: Route.ComponentProps["loaderData"]["live"];
}) {
  void props;
  return (
    <section id="live" aria-labelledby="live-heading" className="section-pad bg-ground">
      <div className="container-page">
        <SectionHeading
          eyebrow={content.live.eyebrow}
          heading={content.live.heading}
          id="live-heading"
        />
      </div>
    </section>
  );
}
