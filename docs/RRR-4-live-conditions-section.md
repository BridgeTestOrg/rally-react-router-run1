# RRR-4: Live conditions section

## What changed
The home page's `#live` section now streams per-city conditions (CO, CA, NJ).

- `app/sections/live/live.server.ts`: `loadLive` captures `now()` once and returns the un-awaited `getConditions(...).then(buildLiveViewModel)` promise, so the page does not wait on weather. `formatNextOpen`, `formatLiveStamp` and `buildLiveViewModel` produce a plain serializable view model (explicit clock, local-calendar "tomorrow" via `addLocalDays`, no `Date` objects).
- `LiveSection.tsx`: heading stays outside `Suspense`; `Await` resolves the view model; `errorElement` shows the shared notice with no stamp or error details. `aria-live="polite"` wrapper with `aria-busy` states. No polling or client fetching.
- `LiveCard.tsx`, `SkeletonCard.tsx` (aria-hidden, shimmer), `LiveNotice.tsx` (28px decorative icon).
- `app/app.css`: one delimited `live-` block; cards share geometry; the failure wrapper reserves full row height; one stamp slot (beneath heading to 1024px, right-aligned above).
- `app/entry.server.tsx`: revealed via `react-router reveal entry.server`; `streamTimeout` raised to 10 s so it stays above the 3 s per-city weather timeout.
- `app/routes/__tests__/home.test.tsx`: loader fixture updated to the new streamed shape.

## Decisions
- A missing court lookup downgrades only that city to the unavailable card (no ID exposed, no no-slot wording).
- Stamp: oldest non-null available timestamp, or latest failed timestamp when all are unavailable; falls back to the request instant.
- Revalidation retention relies on `Await` behavior; no custom cache.

## Verification
`npm run typecheck`, `npm test`, `npm run build` pass. Rendered fidelity against the design comps is not verified (comps were not present in the repo).
