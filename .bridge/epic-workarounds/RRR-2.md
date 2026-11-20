# RRR-2 workaround record

## Unverified: rendered comparison with the comps (plan step 17)

- **Requirement:** the page matches the comps at 1280px and 390px, with no overlap or clipping, no sideways scrolling from 320px, and correct hero-card behavior after hydration.
- **Why it is unverified:** no live server was available for a rendered check. `epic-implementer epic-server turn acquire --ticket RRR-2 --head <head> --wait 900` returned `unavailable` / `no_live_server` / `no_epic_server_for_this_run`, twice. This ticket's plan adds no browser harness (the testing owner's ticket does).
- **Substitute delivered:** static and SSR checks only.
  - Contrast ratios computed for every declared text and indicator pairing; all pass after one fix (focus ring on dark green, now with a white gap).
  - Token, type-scale, breakpoint (768 / 1024 inclusive) and reduced-motion inspection of `app/app.css` and components.
  - Production build served locally: `/` returns 200 with one `<h1>`, one `<main>`, all five section IDs, the default hero card, and no external hosts.
  - Source compared by eye against comps 01, 02, 03, 12 and 18 (desktop and phone): hero card layout, step circles and footer color were corrected from them.
- **Human step still owed (before merge):** run the app (`npm run build && npm start`), open `/` at 1280px and 390px, compare with comps 01–03, 12 and 18, check there is no horizontal scroll down to 320px, and check the hero card in a Denver, Los Angeles, New York and other time zone with no console errors.

## Not part of this ticket

Unit tests, the Playwright harness, the weather stub and CI e2e job belong to the separate testing owner. None exist in this branch yet.
