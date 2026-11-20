# RRR-2 workaround record

## Partly verified: rendered comparison with the comps (plan step 17)

- **Requirement:** the page matches the comps at 1280px and 390px, with no overlap or clipping, no sideways scrolling from 320px, and correct hero-card behavior after hydration.
- **Why the epic server was not used:** `epic-implementer epic-server turn acquire --ticket RRR-2 --head <head> --wait 900` returned `unavailable` / `no_live_server` / `no_epic_server_for_this_run`, twice at the final head.
- **Substitute delivered:** the production build served locally and rendered in the machine's own headless Chrome (no install). Observed:
  - Screenshots at 1280px, 390px and 320px (the narrow widths through an iframe, so media queries see the real width): no horizontal scroll, hero and steps stack at phone widths, header text links hide, layout matches comps 01, 02, 03, 12 and 18 in structure and proportions. Two defects found this way (How-it-works heading overlapping the cards; hero art column too wide) were fixed.
  - Hero card after hydration, with `TZ` set for Chrome: Denver, New York and Los Angeles show "Near you" with the right city and courts; Tokyo keeps the default card. No console or hydration messages were logged in any run.
  - Static checks: WCAG contrast for 24 pairings (one fix: focus ring on dark green), type scale, 768/1024 breakpoints, reduced-motion.
- **Not verified (human step before merge):**
  - Pixel-level side-by-side comparison with the comps (spacing, exact type sizes, shadows). The hero card covers most of the court drawing at 320px; confirm that is acceptable.
  - Keyboard focus ring appearance on every control.
  - Live, finder and waitlist bodies: out of scope here, they are heading-only shells.

## Not part of this ticket

Unit tests, the Playwright harness, the weather stub and the CI e2e job belong to the separate testing owner. None exist in this branch yet.
