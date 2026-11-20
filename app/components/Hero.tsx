import { content } from "../lib/content";
import { CourtDrawing } from "./CourtDrawing";
import { HeroCard } from "./HeroCard";
import { Button } from "./ui";

export function Hero() {
  const { hero } = content;
  return (
    <section className="bg-court pb-16 stack:pb-20">
      <div className="container-page grid items-center gap-10 pt-8 stack:grid-cols-[1.35fr_1fr] stack:gap-12 stack:pt-12">
        <div>
          <p className="text-eyebrow text-ball">{hero.eyebrow}</p>
          <h1 className="text-hero mt-4">
            <span className="text-white">{hero.headline}</span>{" "}
            <span className="text-ball">{hero.headlineAccent}</span>
          </h1>
          <p className="text-lead mt-5 max-w-[34rem] text-on-court">{hero.lead}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button to="#waitlist" variant="ball">
              {hero.primaryCta}
            </Button>
            <Button to="#live" variant="ghost">
              {hero.secondaryCta}
            </Button>
          </div>
        </div>
        <CourtDrawing>
          <HeroCard />
        </CourtDrawing>
      </div>
    </section>
  );
}
