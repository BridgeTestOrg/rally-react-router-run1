# Rally

Rally shows which public outdoor pickleball courts in Highlands Ranch, Santa Monica and Hoboken are open and playable. It is a React Router (framework mode, SSR) app styled with Tailwind CSS v4.

## What is implemented

- Server-rendered page at `/` with the header, hero, **How it works**, **FAQ** and footer.
- A hydration-safe hero card: the server and first client render always show the default card; after mount the browser's time zone (Denver, Los Angeles or New York) swaps in the visitor's city. Other zones keep the default.
- Heading-only shells for **Live conditions** (`#live`), **Court finder** (`#courts`) and **Waitlist** (`#waitlist`). Their loaders and action are placeholders returning `null`.
- All copy comes from `content/rally.json` via `app/lib/content.ts`. The root error boundary is the one exception.
- Content and SVG assets are bundled with the build, and fonts (Bricolage Grotesque, Inter) are self-hosted through `@fontsource`; the page makes no font CDN requests.
- The page is light-only: it ignores the visitor's dark-mode preference.

Weather fetching, court finder behavior, waitlist persistence and the JSON endpoints belong to later tickets. This foundation makes no weather requests and sends no email.

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
