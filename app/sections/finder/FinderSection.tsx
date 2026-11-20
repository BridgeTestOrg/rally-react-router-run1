import { SectionHeading } from "../../components/ui";
import { content } from "../../lib/content";
import type { Route } from "../../routes/+types/home";

/**
 * Heading-only shell. Contract for later tickets: keep `id="courts"` and the
 * heading's place in the section; the data type and section body may change.
 */
export function FinderSection(props: {
  data: Route.ComponentProps["loaderData"]["finder"];
}) {
  void props;
  return (
    <section id="courts" aria-labelledby="courts-heading" className="section-pad bg-paper">
      <div className="container-page">
        <SectionHeading
          eyebrow={content.finder.eyebrow}
          heading={content.finder.heading}
          id="courts-heading"
        />
      </div>
    </section>
  );
}
