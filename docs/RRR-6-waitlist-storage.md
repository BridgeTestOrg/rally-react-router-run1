# RRR-6: Waitlist storage and form

**What**: Replaced the placeholder waitlist action with validation plus SQLite storage, and built the form, success and duplicate views.

**Files**: `app/db/{migrations,db.server,waitlist.server}.ts`, `app/sections/waitlist/*`, `scripts/db-migrate.ts`, `package.json` (`db:migrate`), `tsconfig.json` (`allowImportingTsExtensions`), `Dockerfile`, `.dockerignore`, `.gitignore`, `README.md`. `app/routes/home.tsx` and `app/app.css` are unchanged.

**Decisions**
- `node:sqlite` rather than a new dependency; local imports use `.ts` extensions so `node scripts/db-migrate.ts` runs on Node 24 without a build.
- One `INSERT ... ON CONFLICT(email) DO NOTHING RETURNING id` makes concurrent signups resolve to one row; no check-then-insert.
- Migrations run under `BEGIN IMMEDIATE` and validate history inside the transaction.
- Failure responses return the raw submitted values; the email input is `type="text"` so browsers keep them intact.

**Verification**: `npm run typecheck`, `npm test`, `npm run build`, and a local `npm run db:migrate` run twice. Rendered comp fidelity was not checked: the design comps are not in the repository.
