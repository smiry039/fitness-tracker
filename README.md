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

| Stat       | Fed by                     |
| ---------- | -------------------------- |
| **Vigour** | chest, shoulders (pressing)|
| **Will**   | back (pulling)             |
| **Might**  | legs, core                 |
| **Sinew**  | arms                       |
| **Heart**  | cardio / conditioning      |

XP per set: weighted lifts earn from volume (reps × kg), bodyweight moves per
rep, cardio per minute. Levels are derived from XP by a curve in code
(`src/lib/viking.ts`) so progression can be retuned without a migration.

## Tech stack

- **Next.js 14** (App Router, TypeScript) — pages + REST API in one project.
- **Prisma + SQLite** — local file database (`prisma/dev.db`, git-ignored).
- **Recharts** — the progress graph.

A REST API backs every screen (`/api/*`), so a future iOS client can talk to the
same endpoints.

## Getting started

```bash
npm install          # installs deps (see engine note below)
npm run db:reset     # create the SQLite DB + seed the default routine & demo data
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
  seed.ts            # default Push/Pull/Legs routine + demo history
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

- Replace the seeded default routine with your real program.
- Hunts (→ nutrition tracking) and resource gathering.
- Clans / shieldwalls: social layer, shared goals, territory (4X).
- iOS app against this same API.

## Note on the seed routine

`prisma/seed.ts` ships a generic Push/Pull/Legs split plus a few weeks of demo
history so the graphs and calendar aren't empty on first run. Replace the
`EXERCISES` / `ROUTINE` data with your own program and run `npm run db:reset`.
