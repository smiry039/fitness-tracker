# Fitness Tracker

A gamified workout tracker. Log your lifts, watch your progress trend on graphs,
and grow a **Viking** whose stats level up from the training you actually do.

> Status: **early backend + minimal UI.** The focus right now is a solid,
> correct data layer for logging and progress — not visual polish. Hunts,
> resources, and clans/shieldwalls come later; the foundation here is built to
> grow into them.

## What works today

- **Today** — see your suggested next workout (auto-rotates through your split)
  and your full routine.
- **Log** — record the sets you did for a workout day. Empty sets are ignored;
  weights in kg.
- **Graph** — per-exercise progress over time: estimated 1RM (Epley), top-set
  weight, or total volume.
- **Calendar** — month grid of which days you trained and what you did.
- **Viking** — a character sheet of five stats that grow from your logged volume.

## The Viking

Every set you log feeds XP into exactly one stat, decided by the exercise's
muscle group:

| Stat       | Fed by                          |
| ---------- | ------------------------------- |
| **Vigour** | chest, delts (pressing)         |
| **Will**   | back, rear delts, neck (pulling)|
| **Might**  | legs, calves                    |
| **Sinew**  | biceps, triceps, arms           |
| **Heart**  | cardio / conditioning (future)  |

XP per set: weighted lifts earn from volume (reps × kg), bodyweight moves per
rep, cardio per minute. Levels are derived from XP by a curve in code
(`src/lib/viking.ts`) so progression can be retuned without a migration.

## Tech stack

- **Next.js 14** (App Router, TypeScript) — pages + REST API in one project.
- **Prisma** — SQLite file for local dev, **Turso (libSQL)** in production via a
  driver adapter (auto-selected by env; see `src/lib/db-client.ts`).
- **Recharts** — the progress graph.

A REST API backs every screen (`/api/*`), so a future iOS client can talk to the
same endpoints.

## The program

The current block is **"Balanced Hypertrophy"** — full body 3×/week
(Mon/Wed/Fri), ~7 exercises a session. Legs lead every day (Day 1 quads, Day 2
glutes/hams, Day 3 balanced), arms get a curl + triceps superset every session,
chest and back drop to one movement each per day, laterals every day.

The previous **"Aesthetic Mass"** block (Day A / B / C) is kept as unscheduled
alternatives — loggable, never auto-suggested. See `prisma/program.ts` for the
exact exercises, targets, and cues.

## Security

- No secrets live in the repo; the database (`*.db`) and `.env` are git-ignored.
- Security headers (CSP, `X-Frame-Options`, `nosniff`, etc.) are set in
  `next.config.mjs`; `X-Powered-By` is disabled.
- All writes go through validated, bounded input parsing; Prisma parameterises
  every query (no SQL injection).
- **Hosting:** the app has no account system. Set `APP_PASSWORD` and the whole
  site sits behind a sign-in page (`src/middleware.ts`, `src/lib/auth.ts`).
  Signing in sets an HttpOnly signed cookie that lasts ~400 days and renews
  itself while used, so each device (including a home-screen PWA) signs in
  once. Changing the password signs every device out. Unset locally.
- Production uses **Turso** (managed DB, token-based, rotatable) rather than a
  file on the server — smaller attack surface, nothing to patch.

See [DEPLOY.md](./DEPLOY.md) for the recommended **Vercel + Turso** setup (free,
persistent) and the Docker alternative.

## Getting started

```bash
npm install          # installs deps (see engine note below)
npm run db:reset     # create the SQLite DB + seed the routine (wipes all data!)
npm run dev          # http://localhost:3000
```

### Prisma engine note

If `npm install` can't download the Prisma query engine on your network, the
package tree still installs fine — fetch the engine and generate the client
manually:

```bash
npm install --ignore-scripts
npx prisma generate
npx prisma db push
```

## Project layout

```
prisma/
  schema.prisma      # data model: exercises, routine, sessions, sets, viking
  program.ts         # the training program (exercises + days)
  seed.ts            # fresh DB: wipe + load program
  sync-routine.ts    # live DB: apply program, keep history
src/
  lib/
    prisma.ts        # PrismaClient singleton
    viking.ts        # stat mapping, XP rules, level curve  (the game engine)
    data.ts          # all queries + the "log a session and award XP" logic
  app/
    page.tsx         # Today
    log/             # Log a workout (form is a client component)
    graph/           # Progress graphs
    calendar/        # Calendar month view
    viking/          # Character sheet
    api/             # REST endpoints (sessions, graph, viking, routine, ...)
```

## API

| Method | Route                         | Purpose                          |
| ------ | ----------------------------- | -------------------------------- |
| GET    | `/api/routine`                | Full routine with exercises      |
| GET    | `/api/exercises`              | All exercises                    |
| GET    | `/api/sessions`               | Recent logged sessions           |
| POST   | `/api/sessions`               | Log a workout (awards Viking XP) |
| GET    | `/api/graph?exerciseId=`      | Progress series for one exercise |
| GET    | `/api/calendar?y=&m=`         | Sessions in a given month        |
| GET    | `/api/viking`                 | Viking character sheet           |

## Roadmap

- Conditioning work to bring the **Heart** stat to life.
- Hunts (→ nutrition tracking) and resource gathering.
- Clans / shieldwalls: social layer, shared goals, territory (4X).
- iOS app against this same API.

## Changing the routine

The program lives in `prisma/program.ts` (`EXERCISES` + `ROUTINE`). Edit it,
then run `npm run db:sync-routine` — it updates exercises and routine days in
place and **keeps every logged session, set and Viking XP**. Days with a
`dayOfWeek` are the rotation; `dayOfWeek: null` days are loggable alternatives.
Never rename an exercise that has history — add a new one instead.

`npm run db:reset` rebuilds from scratch and **wipes all history** — only for a
fresh local database.
