# RRR-3: Court data, local-time rules and conditions

**What changed:** bundled `data/courts.json` (copied byte for byte from the ticket attachment), pure court/time/verdict rules (`app/lib/courts.ts`, `time.ts`, `verdict.ts`), server modules (`courts.server.ts`, `weather.server.ts`, `conditions.server.ts`) and routes `/api/courts` and `/api/conditions`.

**Key decisions:** time arithmetic uses explicit-zone `Intl` and UTC calendar math, never host-local time; repeated DST wall times resolve to the earlier instant and nonexistent ones are rejected. Weather failures are never cached and never leak upstream details. Only `WEATHER_URL` is contacted.

**No new dependencies, settings or commands.** Contract details are in the README section "Court and conditions JSON API (RRR-3)".

**Verification:** `npm test` (Vitest), `npm run typecheck`, `npm run build`.
