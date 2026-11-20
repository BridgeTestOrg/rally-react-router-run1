import { Suspense } from "react";
import { Await } from "react-router";
import { SectionHeading } from "../../components/ui";
import { content } from "../../lib/content";
import type { Route } from "../../routes/+types/home";
import { LiveCard } from "./LiveCard";
import { LiveNotice } from "./LiveNotice";
import { SkeletonCard } from "./SkeletonCard";

/**
 * Contract: keep `id="live"` and the heading's place in the section. The
 * heading stays outside the suspended subtree. No polling or client fetching:
 * updates come from navigation and loader revalidation.
 */
export function LiveSection(props: {
  data: Route.ComponentProps["loaderData"]["live"];
}) {
  return (
    <section id="live" aria-labelledby="live-heading" className="section-pad bg-ground">
      <div className="container-page live-section">
        <SectionHeading
          eyebrow={content.live.eyebrow}
          heading={content.live.heading}
          id="live-heading"
        />
        <div aria-live="polite">
          <Suspense
            fallback={
              <div aria-busy="true">
                <p className="live-stamp text-small text-muted">
                  {content.live.stampLoading}
                </p>
                <div className="live-grid">
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              </div>
            }
          >
            <Await
              resolve={props.data}
              errorElement={
                <div aria-busy="false" className="live-result">
                  <LiveNotice />
                </div>
              }
            >
              {(live) => (
                <div aria-busy="false">
                  <p className="live-stamp text-small text-muted">
                    <span className="live-dot" aria-hidden="true" />
                    {live.stampText}
                  </p>
                  {live.allUnavailable ? (
                    <div className="live-result">
                      <LiveNotice />
                    </div>
                  ) : (
                    <div className="live-grid">
                      {live.cities.map((city) => (
                        <LiveCard key={city.key} city={city} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Await>
          </Suspense>
        </div>
      </div>
    </section>
  );
}
