import { Faq } from "../components/Faq";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { Hero } from "../components/Hero";
import { HowItWorks } from "../components/HowItWorks";
import { content } from "../lib/content";
import { FinderSection } from "../sections/finder/FinderSection";
import { loadFinder } from "../sections/finder/finder.server";
import { LiveSection } from "../sections/live/LiveSection";
import { loadLive } from "../sections/live/live.server";
import { WaitlistSection } from "../sections/waitlist/WaitlistSection";
import { waitlistAction } from "../sections/waitlist/waitlist.server";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: content.site.title },
    { name: "description", content: content.site.description },
  ];
}

export async function loader(args: Route.LoaderArgs) {
  return {
    // Not awaited on purpose: the live section streams in after the page.
    live: loadLive(args),
    finder: await loadFinder(args),
  };
}

export function action(args: Route.ActionArgs) {
  return waitlistAction(args);
}

export default function Home({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <LiveSection data={loaderData.live} />
        <FinderSection data={loaderData.finder} />
        <HowItWorks />
        <WaitlistSection data={actionData} />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
