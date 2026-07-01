# Deploying / hosting

This is a **stateful** app: a Next.js server plus a **SQLite** database file.
That one fact drives every hosting choice — you need somewhere the database file
can live and persist between requests.

## Protect it first

The app has no login system. Before putting it on a public URL, set a password
so the world can't read or write your training log:

```
APP_USER=you
APP_PASSWORD=something-long-and-random
```

With `APP_PASSWORD` set, every page and API route requires HTTP Basic Auth
(enforced in `src/middleware.ts`). Unset locally = no prompt.

## Option A — Docker (any VPS, Fly.io, Railway, a home server) — recommended

The included `Dockerfile` builds a self-contained image and keeps the database
in `/app/data` so it survives restarts.

```bash
docker build -t fitness-tracker .
docker run -d -p 3000:3000 \
  -v fitness_data:/app/data \
  -e APP_USER=you -e APP_PASSWORD=change-me \
  fitness-tracker
```

The container runs `prisma db push` on boot to create the schema on the volume,
then starts the server. To load the routine the first time:

```bash
docker exec -it <container> npx tsx prisma/seed.ts
```

## Option B — Railway / Fly.io / Render

All three can build the `Dockerfile` directly. Attach a **persistent volume**
mounted at `/app/data` and set the `APP_USER` / `APP_PASSWORD` env vars. Without
a persistent volume the SQLite file is wiped on every deploy.

## What about GitHub Pages / Vercel?

- **GitHub Pages** hosts static files only. It cannot run the server or the API,
  so it can't host this app as-is.
- **Vercel** runs Next.js beautifully, but its serverless filesystem is
  ephemeral — a SQLite file there does not persist writes. To use Vercel, swap
  the datasource to a hosted database (e.g. **Turso/libSQL**, or Postgres via
  `@prisma/adapter-*`). That's a small `schema.prisma` change plus an env var,
  and is the natural next step if you want a zero-ops URL.

## Summary

| Host                    | Works as-is? | Notes                                  |
| ----------------------- | ------------ | -------------------------------------- |
| Docker on a VPS         | ✅           | Persistent volume at `/app/data`       |
| Railway / Fly / Render  | ✅           | Add a persistent volume                |
| Vercel                  | ⚠️           | Needs a hosted DB (Turso/Postgres)     |
| GitHub Pages            | ❌           | Static only — no server/DB             |
