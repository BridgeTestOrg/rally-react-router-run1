# Rally

Rally shows which public outdoor pickleball courts in Highlands Ranch, Santa Monica and Hoboken are open and playable. It is a React Router (framework mode, SSR) app styled with Tailwind CSS v4.

## What is implemented

- Server-rendered page at `/` with the header, hero, **How it works**, **FAQ** and footer.
- A hydration-safe hero card: the server and first client render always show the default card; after mount the browser's time zone (Denver, Los Angeles or New York) swaps in the visitor's city. Other zones keep the default.
- Heading-only shells for **Live conditions** (`#live`), **Court finder** (`#courts`) and **Waitlist** (`#waitlist`). Live and finder loaders are placeholders; the waitlist action validates and stores signups (see Waitlist storage).
- All copy comes from `content/rally.json` via `app/lib/content.ts`. The root error boundary is the one exception.
- Content and SVG assets are bundled with the build, and fonts (Bricolage Grotesque, Inter) are self-hosted through `@fontsource`; the page makes no font CDN requests.
- The page is light-only: it ignores the visitor's dark-mode preference.

Weather fetching, court finder behavior, the JSON endpoints belong to later tickets. This foundation makes no weather requests and sends no email.

## Settings

Read only in `app/lib/config.server.ts`, which is also the only source of the app's current time (`now()`).

| Setting | Default | Notes |
|---|---|---|
| `WEATHER_URL` | `https://api.weather.gov` | Must be an absolute http(s) URL. |
| `RALLY_NOW` | unset (real clock) | Freezes time. An ISO instant with an explicit offset or `Z`, e.g. `2026-11-17T17:40:00-07:00`. |
| `DATABASE_PATH` | `data/rally.db` | SQLite file; git ignores it and its `-wal`/`-shm` files. |

Empty or whitespace-only values count as unset. A nonblank invalid `WEATHER_URL` or `RALLY_NOW` throws a configuration error that names the setting, never silently falling back to a default or the real clock.

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

## Requirements and tests

Node 24 (see `.nvmrc`) and npm.

```bash
npm test           # Vitest
npm run typecheck
npm run build
```

## Waitlist storage

Signups live in local SQLite (`node:sqlite`, no extra package) at `DATABASE_PATH` (default `data/rally.db`).

- `npm run db:migrate` opens the database and applies pending migrations; the app also migrates automatically on first use. A missing parent directory is created. `*.db`, `-wal` and `-shm` files are git- and Docker-ignored.
- Signup and migration timestamps come from `now()`, so `RALLY_NOW` controls them. A duplicate's date is shown in the original signup city's time zone.
- The database uses WAL and waits up to about 3 seconds on lock contention; beyond that the form shows a sanitized, retryable error.
- The container creates a writable `/app/data`. Mount a volume there if signups must survive container replacement.
- Signup data stays in local SQLite. The app sends no email and makes no outbound signup requests.

## Court and conditions JSON API (RRR-3)

Both endpoints are loader-only resource routes (`app/routes/api.courts.ts`, `app/routes/api.conditions.ts`).

### `GET /api/courts`

Query: `state` (`all`|`CO`|`CA`|`NJ`), `day` (`today`|`tomorrow`|`sat`), `time` (`any`|`am`|`pm`|`eve`), `lights=1`, `parking=1`. Missing, empty or unknown values default to `all`, `today`, `any`, off, off (no 4xx); booleans are enabled only by the exact value `1`.

- Everything is computed in each court's own time zone at the request time (`now()` from `config.server.ts`).
- Windows: `am` is before 12:00, `pm` is 12:00 to before 17:00, `eve` is 17:00 or later. Today excludes slots starting at or before the current local time. `sat` is the coming Saturday, or today when today is Saturday.
- An empty query returns all six courts in data order. Otherwise a court needs a slot on the selected day, except that a court closed on that date (closure) or at/past closing when the day is today stays listed with no slots. A court that has not opened yet is not retained.
- `openNow`, `status` and `closedReason` always describe the current local date; `slots.today|tomorrow|sat` are all filled by the same slot rules.

### `GET /api/conditions`

One entry per city in CO, CA, NJ order. Weather comes from the NWS (`WEATHER_URL`), sent with `User-Agent: Rally test app (hello@example.com)`, redirects rejected, and the `forecastHourly` URL must share `WEATHER_URL`'s origin. One 3 s deadline covers both requests and body parsing per city. Only successes are cached (10 minutes, reused only for the same court and a slot inside the cached forecast period); concurrent identical requests share one in-flight operation.

`updatedAt`: the original fetch time for a success (cache hits keep it), the caller's attempt time (city zone) for a failed fetch, `null` when there is no open slot in the next seven days.

### Accepted standards exceptions

1. Resource routes are loader-only (no default component, no action).
2. Invalid or absent filters default rather than returning 4xx.
3. `weather.server.ts` keeps a bounded process-local success cache and in-flight registry.

### Integration points for later work

`getConditions(now())`, `listCourts(filters, now)` and `getCourtById(id)` are the server entry points; the live page can return the conditions promise without awaiting it. `app/routes/home.tsx` and the section loaders are intentionally unchanged.
