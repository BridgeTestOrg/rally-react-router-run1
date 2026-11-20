# RRR-2: Rally page foundation

## What changed and why
The starter welcome page is replaced by the Rally landing page foundation: static sections, bundled content, the hero card, and replaceable shells for features that later tickets build. It is the first change through CI, so it stays small.

## Files and routes
- Route `/` (`app/routes/home.tsx`): `meta` from `content.site`; `loader` returns `{ live: loadLive(args), finder: await loadFinder(args) }` (`live` deliberately not awaited); `action` returns `waitlistAction(args)`.
- `app/lib/`: `content.ts` (`content`, `t()`), `cities.ts`, `format.ts` (`formatTime`, `formatHour`, `formatDate`, `formatWeekday`), `config.server.ts` (settings and `now()`).
- `app/components/`: `ui.tsx`, `Header`, `Hero`, `CourtDrawing`, `HeroCard`, `HowItWorks`, `Faq`, `Footer`.
- `app/sections/{live,finder,waitlist}/`: `*.server.ts` placeholders and heading-only `*Section.tsx` shells. Contract for later tickets: keep section IDs `live`, `courts`, `waitlist` and the heading placement; the data types may change.
- `content/rally.json`, `app/assets/*.svg`: byte-identical copies of the brief's originals.
- Removed: `app/welcome/*`, Google Fonts links in `app/root.tsx`.

## Decisions
- Component-specific breakpoints: hero, steps and header links switch at 768px; live and finder at 1024px. Tailwind's `stack:` (769px) and `wide:` (1025px) variants express "above" these widths.
- Light-only theme; starter dark styling removed.
- Invalid `RALLY_NOW` / `WEATHER_URL` fail fast; blank means unset.
- Section prop types derive from generated `Route.ComponentProps` through type-only imports; runtime imports stay one-way.
- Rejected: fetching fonts from a CDN (violates the no-outside-requests rule); reading `rally-brief/` at runtime (untracked).

## Config
`WEATHER_URL`, `RALLY_NOW`, `DATABASE_PATH`: see `README.md`. No new commands. New dependencies: `@fontsource/bricolage-grotesque`, `@fontsource/inter`.

## Verification
`npm run typecheck`, `npm test` and `npm run build`; see the PR for recorded results. Rendered comparison against the comps was not performed.
