// Apply `program.ts` to an existing database WITHOUT touching logged history.
//
// - Exercises are upserted by name (muscle group / kind updated; ids kept, so
//   past sets and their graphs stay attached).
// - Routine days are matched by name: updated in place if they exist, created
//   if not. Each day's exercise list is replaced with the one in program.ts.
// - Days in the database that aren't in program.ts are left alone (sessions
//   may reference them) but unscheduled so they're never auto-suggested.
// - Sessions, sets and Viking XP are never modified.
//
// Run against Turso by exporting TURSO_DATABASE_URL + TURSO_AUTH_TOKEN first.

import { createPrismaClient } from "../src/lib/db-client";
import { EXERCISES, ROUTINE } from "./program";

const prisma = createPrismaClient();

async function main() {
  const dayNames = new Set(ROUTINE.map((d) => d.name));
  if (dayNames.size !== ROUTINE.length) throw new Error("Day names in program.ts must be unique.");

  const exIdByName = new Map<string, number>();
  for (const e of EXERCISES) {
    const row = await prisma.exercise.upsert({
      where: { name: e.name },
      update: { muscleGroup: e.muscleGroup, kind: e.kind },
      create: e,
    });
    exIdByName.set(e.name, row.id);
  }
  console.log(`  ${EXERCISES.length} exercises upserted`);

  for (let i = 0; i < ROUTINE.length; i++) {
    const day = ROUTINE[i];
    const data = { name: day.name, focus: day.focus, dayOfWeek: day.dayOfWeek, dayOrder: i };
    const existing = await prisma.routineDay.findFirst({ where: { name: day.name } });
    const row = existing
      ? await prisma.routineDay.update({ where: { id: existing.id }, data })
      : await prisma.routineDay.create({ data });

    await prisma.routineExercise.deleteMany({ where: { routineDayId: row.id } });
    for (let j = 0; j < day.exercises.length; j++) {
      const re = day.exercises[j];
      const exerciseId = exIdByName.get(re.name);
      if (!exerciseId) throw new Error(`program.ts references unknown exercise: ${re.name}`);
      await prisma.routineExercise.create({
        data: {
          routineDayId: row.id,
          exerciseId,
          order: j,
          targetSets: re.sets,
          targetReps: re.reps,
          cue: re.cue,
          optional: re.optional ?? false,
        },
      });
    }
    console.log(`  ${existing ? "updated" : "created"} ${day.name} (${day.exercises.length} exercises)`);
  }

  const orphaned = await prisma.routineDay.updateMany({
    where: { name: { notIn: [...dayNames] } },
    data: { dayOfWeek: null, dayOrder: ROUTINE.length },
  });
  if (orphaned.count) console.log(`  ${orphaned.count} day(s) not in program.ts unscheduled`);

  console.log("Routine synced. Logged history untouched.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
