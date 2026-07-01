# Deploying / hosting

This is a **stateful** app: a Next.js server plus a database. Locally that's a
SQLite file; in production it's **Turso** (libSQL — SQLite's protocol, hosted).
The app auto-switches: set `TURSO_DATABASE_URL` and it uses Turso, otherwise the
local file (`src/lib/db-client.ts`).

## Recommended: Vercel + Turso (free tier, no server to maintain)

Best for security + cost: Vercel runs the app serverlessly (nothing for you to
patch, automatic HTTPS), Turso is a managed database reached by a rotatable
token. Both have genuinely free tiers big enough for one person.

### 1. Lock it down first

The app has no accounts. Pick a strong password so your log isn't public:

```bash
openssl rand -base64 24
```

You'll set this as `APP_PASSWORD` below; every page and API route then sits
behind HTTP Basic Auth (`src/middleware.ts`).

### 2. Create the Turso database

Install the CLI (`brew install tursodatabase/tap/turso` or see turso.tech),
then:

```bash
turso auth signup
turso db create fitness-tracker
turso db show fitness-tracker          # copy the libsql:// URL
turso db tokens create fitness-tracker # copy the auth token
```

Load the schema (generated from prisma/schema.prisma) and seed the routine:

```bash
# schema
turso db shell fitness-tracker < prisma/turso-schema.sql

# routine data — run against Turso by exporting the two vars first
export TURSO_DATABASE_URL="libsql://...."   # from `db show`
export TURSO_AUTH_TOKEN="...."              # from `db tokens create`
npx tsx prisma/seed.ts
```

> Re-run these two lines any time you change `prisma/seed.ts`. To rebuild the
> schema file after a `schema.prisma` change:
> `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/turso-schema.sql`

### 3. Deploy on Vercel

1. Push this repo to GitHub (done — it's on `main`).
2. On vercel.com: **New Project → import the repo.** It auto-detects Next.js;
   no build settings needed (`postinstall` runs `prisma generate`).
3. Add **Environment Variables** (Production + Preview):
   - `TURSO_DATABASE_URL` — the `libsql://` URL
   - `TURSO_AUTH_TOKEN` — the token
   - `APP_USER` — a username (e.g. your name)
   - `APP_PASSWORD` — the `openssl rand` value from step 1
4. Deploy. From then on, every push to `main` auto-deploys.

You'll get a password-protected `https://…vercel.app` URL, free, with data that
persists in Turso. **Never commit the token** — it lives only in Vercel's env.

## Alternative: Docker (self-host / VPS / Fly.io / Railway)

Keeps SQLite as-is with a persistent volume. See the `Dockerfile`:

```bash
docker build -t fitness-tracker .
docker run -d -p 3000:3000 -v fitness_data:/app/data \
  -e APP_USER=you -e APP_PASSWORD="$(openssl rand -base64 24)" \
  fitness-tracker
docker exec -it <container> npx tsx prisma/seed.ts   # first-time routine load
```

The container has no `TURSO_*` vars, so it uses the SQLite file on the mounted
volume at `/app/data`.

## What won't work as-is

| Host                    | Works?       | Notes                                   |
| ----------------------- | ------------ | --------------------------------------- |
| **Vercel + Turso**      | ✅ (free)    | Recommended. Managed, HTTPS, persistent |
| Docker on a VPS / Fly   | ✅           | Persistent volume at `/app/data`        |
| Render (free)           | ❌           | No persistent disk on free tier         |
| GitHub Pages            | ❌           | Static only — no server/DB              |
