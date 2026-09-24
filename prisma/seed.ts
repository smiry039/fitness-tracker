// Seed a FRESH database: wipes everything (including logged sessions and
// Viking XP), then loads the program from `program.ts`. No fake workout
// history is seeded — the graph and calendar fill in as you log real sessions.
//
// To change the routine on a database that already has history, use
// `npm run db:sync-routine` instead — it keeps every logged set.

import { createPrismaClient } from "../src/lib/db-client";
import { EXERCISES, ROUTINE } from "./program";

// Uses Turso when TURSO_DATABASE_URL is set, else the local SQLite file.
const prisma = createPrismaClient();

async function main() {
  console.log("Resetting seed data...");

  // Wipe in FK-safe order.
  await prisma.setLog.deleteMany();
  await prisma.workoutSession.deleteMany();
  await prisma.routineExercise.deleteMany();
  await prisma.routineDay.deleteMany();
  await prisma.vikingStat.deleteMany();
  await prisma.viking.deleteMany();
  await prisma.exercise.deleteMany();

  // Exercises
  const exIdByName = new Map<string, number>();
  for (const e of EXERCISES) {
    const created = await prisma.exercise.create({ data: e });
    exIdByName.set(e.name, created.id);
  }
  console.log(`  ${EXERCISES.length} exercises`);

  // Routine
  for (let i = 0; i < ROUTINE.length; i++) {
    const day = ROUTINE[i];
    const createdDay = await prisma.routineDay.create({
      data: {
        name: day.name,
        focus: day.focus,
        dayOfWeek: day.dayOfWeek,
        dayOrder: i,
      },
    });
    for (let j = 0; j < day.exercises.length; j++) {
      const re = day.exercises[j];
      const exerciseId = exIdByName.get(re.name);
      if (!exerciseId) throw new Error(`Seed references unknown exercise: ${re.name}`);
      await prisma.routineExercise.create({
        data: {
          routineDayId: createdDay.id,
          exerciseId,
          order: j,
          targetSets: re.sets,
          targetReps: re.reps,
          cue: re.cue,
          optional: re.optional ?? false,
        },
      });
    }
  }
  console.log(`  ${ROUTINE.length} training days`);

  // The character starts fresh — all stats at 0. XP accrues as you log.
  await prisma.viking.create({ data: { name: "Ragnar" } });
  console.log(`  Viking "Ragnar" created (stats start at 0)`);

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
