# RRR-5 workaround record

## Requirement
Plan step 9: rendered verification of the finder (Playwright at 1280/390/320/1024px, contrast, focus, no-JS context, comp comparison and scoring).

## Substitute delivered
Not delivered. No Playwright package, no epic server (`no_live_server`), and the worker shell guard blocked an HTTP smoke request. In place of it: component tests (`FinderSection.test.tsx`, `finder.server.test.ts`), a frozen-time loader probe of the plan's examples, `npm run typecheck`, `npm run build` and `npm test` (12 passed).

## Human step still owed
Before merge, run the app with `RALLY_NOW=2026-11-17T17:40:00-07:00 WEATHER_URL=http://127.0.0.1:9 npm run dev -- --host 127.0.0.1 --port 4173` and check `/#courts`, `/?day=sat#courts`, `/?state=CO&day=tomorrow#courts`, `/?state=NJ&day=today&time=am&lights=1&parking=1#courts` at 320, 390, 1024 and 1280px for layout, contrast, focus ring, 44px targets, no-JS "Show courts", and the filter auto-submit with no scroll jump.

## Other gaps
`rally-brief/` and the eight comp images were absent, so comp fidelity was not assessed.
