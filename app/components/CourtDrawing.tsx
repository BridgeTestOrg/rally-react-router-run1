import type { ReactNode } from "react";

import { content } from "../lib/content";

/**
 * Code-drawn court seen from above. `children` (the hero card) is positioned
 * inside the illustration's bounds but is a sibling of the image-role element,
 * so its text stays accessible.
 */
export function CourtDrawing({ children }: { children?: ReactNode }) {
  return (
    <div className="relative aspect-[16/10] w-full stack:aspect-[4/5]">
      <div
        role="img"
        aria-label={content.hero.courtArtLabel}
        className="absolute inset-0 overflow-hidden rounded-art border-[6px] border-white bg-court-surface shadow-[0_30px_60px_rgba(0,0,0,0.25)]"
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-[32%] h-[3px] bg-white/80" />
        <span aria-hidden="true" className="absolute inset-x-0 top-[68%] h-[3px] bg-white/80" />
        <span aria-hidden="true" className="absolute top-0 left-1/2 h-[32%] w-[3px] -translate-x-1/2 bg-white/80" />
        <span aria-hidden="true" className="absolute bottom-0 left-1/2 h-[32%] w-[3px] -translate-x-1/2 bg-white/80" />
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 bg-white" />
        <span
          aria-hidden="true"
          className="absolute top-[20%] right-[22%] size-[34px] rounded-full bg-ball shadow-[0_6px_6px_rgba(0,0,0,0.25)]"
        />
      </div>
      {children}
    </div>
  );
}
