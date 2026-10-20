// Runs before `next build`. On Vercel production deploys, applies program.ts
// to Turso (see prisma/sync-routine.ts — logged history is never touched), so
// pushing a routine change to main is all it takes. Preview deploys share the
// same database, so they skip it; so do local and Docker builds.
import { spawnSync } from "node:child_process";

if (process.env.VERCEL_ENV !== "production") {
  console.log("sync-on-deploy: not a Vercel production build, skipping routine sync");
  process.exit(0);
}

const r = spawnSync("npx", ["tsx", "prisma/sync-routine.ts"], { stdio: "inherit" });
process.exit(r.status ?? 1);
