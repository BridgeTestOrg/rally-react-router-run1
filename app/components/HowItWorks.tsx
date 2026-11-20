import { content } from "../lib/content";
import { SectionHeading } from "./ui";

export function HowItWorks() {
  const { how } = content;
  return (
    <section id="how" aria-labelledby="how-heading" className="section-pad bg-ground">
      <div className="container-page">
        <SectionHeading eyebrow={how.eyebrow} heading={how.heading} id="how-heading" />
        <ol className="steps mt-10 grid gap-5 stack:grid-cols-3">
          {how.steps.map((step) => (
            <li key={step.title} className="card p-6">
              <span
                aria-hidden="true"
                className="step-number grid size-10 place-items-center rounded-full bg-ball font-bold text-ball-ink"
              />
              <h3 className="text-card-title mt-4 text-ink">{step.title}</h3>
              <p className="mt-2 text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
