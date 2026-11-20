# RRR-5: Court finder

Replaces the finder placeholder with a working, URL-driven court finder.

## What changed
- `app/sections/finder/filters.ts`: adapter over `parseCourtFilters`; exports `DEFAULT_FILTERS` and `parseFinderFilters`. Bad or missing values default independently (no 4xx, no redirect); `state=` means All; checkboxes need exactly `1`.
- `app/sections/finder/types.ts`: client-safe `FinderCourtRow`.
- `app/sections/finder/finder.server.ts`: `loadFinder` reads one `now()`, calls `listCourts`, and builds serializable rows with `courtStatus`, `formatTime` and content templates. Closed rows (closure, or at or after closing today) keep no chips; other rows with no slots are omitted.
- `FilterForm.tsx`: native GET form (works without JS, `Show courts` in `<noscript>`); with JS, changes auto-submit via `useSubmit` with `replace` and `preventScrollReset`. Checked state derives from loader filters.
- `CourtRow.tsx`, `FinderSection.tsx`: result cards, count line, clear link, local-time note, empty state.
- `app/routes/home.tsx` is unchanged.

## Decisions
- Reuse the shared court rules; no duplicated filtering. No new dependencies or env vars.
- Relative imports, matching the existing code.

## Verification
`npm test`, `npm run typecheck`. Rendered checks use `RALLY_NOW=2026-11-17T17:40:00-07:00`.
