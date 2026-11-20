import { useEffect, useState } from "react";

import { isCityTimeZone } from "../lib/cities";
import { content } from "../lib/content";
import { Badge } from "./ui";

type CardContent = { badge: string; name: string; line: string };

/**
 * The server and the first client render always use the default card, so
 * hydration matches. After mount, a supported browser time zone swaps in the
 * visitor's city; anything else keeps the default.
 */
export function HeroCard() {
  const [card, setCard] = useState<CardContent>(content.hero.card.default);

  useEffect(() => {
    let zone: string | undefined;
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (isCityTimeZone(zone)) {
      const city = content.hero.card.byTimeZone[zone];
      setCard({ badge: content.hero.card.nearYouBadge, ...city });
    }
  }, []);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="absolute right-[22px] bottom-[22px] left-[22px] grid grid-cols-[auto_1fr] items-start gap-x-3 rounded-hero-card bg-paper px-3.5 py-3 text-ink shadow-lg"
    >
      <div className="flex min-h-7 items-center">
        <Badge tone="success">{card.badge}</Badge>
      </div>
      <div>
        <p className="text-card-title min-h-[1.5rem] text-base font-bold">{card.name}</p>
        <p className="text-small min-h-[2.75rem] text-ink wide:min-h-6">{card.line}</p>
      </div>
    </div>
  );
}
