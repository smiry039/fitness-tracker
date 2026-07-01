// Seed data.
//
// NOTE: The routine below is a sensible default Push/Pull/Legs split so the app
// is usable out of the box. Replace it with your real program by editing this
// file and running `npm run db:reset`. The sample session history exists only
// to make the graph/calendar/Viking visibly work on first run — clear it any
// time with the same command once you start logging for real.

import { PrismaClient } from "@prisma/client";
import { statForMuscleGroup, xpForSet } from "../src/lib/viking";

const prisma = new PrismaClient();

type Kind = "weight" | "bodyweight" | "cardio";

interface ExDef {
  name: string;
  muscleGroup: string;
  kind: Kind;
}

// Master exercise list.
const EXERCISES: ExDef[] = [
  // Push
  { name: "Bench Press", muscleGroup: "chest", kind: "weight" },
  { name: "Overhead Press", muscleGroup: "shoulders", kind: "weight" },
  { name: "Incline Dumbbell Press", muscleGroup: "chest", kind: "weight" },
  { name: "Triceps Pushdown", muscleGroup: "arms", kind: "weight" },
  { name: "Lateral Raise", muscleGroup: "shoulders", kind: "weight" },
  // Pull
  { name: "Deadlift", muscleGroup: "back", kind: "weight" },
  { name: "Barbell Row", muscleGroup: "back", kind: "weight" },
  { name: "Lat Pulldown", muscleGroup: "back", kind: "weight" },
  { name: "Pull-up", muscleGroup: "back", kind: "bodyweight" },
  { name: "Barbell Curl", muscleGroup: "arms", kind: "weight" },
  // Legs
  { name: "Back Squat", muscleGroup: "legs", kind: "weight" },
  { name: "Romanian Deadlift", muscleGroup: "legs", kind: "weight" },
  { name: "Leg Press", muscleGroup: "legs", kind: "weight" },
  { name: "Leg Curl", muscleGroup: "legs", kind: "weight" },
  { name: "Standing Calf Raise", muscleGroup: "legs", kind: "weight" },
  { name: "Plank", muscleGroup: "core", kind: "cardio" },
  // Conditioning
  { name: "Running", muscleGroup: "cardio", kind: "cardio" },
  { name: "Rowing Machine", muscleGroup: "cardio", kind: "cardio" },
];

// The split. Each entry: exercise name -> [targetSets, targetReps].
const ROUTINE: { name: string; exercises: [string, number, string][] }[] = [
  {
    name: "Push",
    exercises: [
      ["Bench Press", 4, "5-8"],
      ["Overhead Press", 3, "6-10"],
      ["Incline Dumbbell Press", 3, "8-12"],
      ["Lateral Raise", 3, "12-15"],
      ["Triceps Pushdown", 3, "10-15"],
    ],
  },
  {
    name: "Pull",
    exercises: [
      ["Deadlift", 3, "5"],
      ["Barbell Row", 4, "6-10"],
      ["Lat Pulldown", 3, "8-12"],
      ["Pull-up", 3, "AMRAP"],
      ["Barbell Curl", 3, "10-12"],
    ],
  },
  {
    name: "Legs",
    exercises: [
      ["Back Squat", 4, "5-8"],
      ["Romanian Deadlift", 3, "8-10"],
      ["Leg Press", 3, "10-12"],
      ["Leg Curl", 3, "10-15"],
      ["Standing Calf Raise", 4, "12-20"],
      ["Plank", 3, "60s"],
    ],
  },
  {
    name: "Conditioning",
    exercises: [
      ["Running", 1, "20-30 min"],
      ["Rowing Machine", 1, "10-15 min"],
    ],
  },
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(18, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

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
  const exByName = new Map<string, { id: number; kind: string; muscleGroup: string }>();
  for (const e of EXERCISES) {
    const created = await prisma.exercise.create({ data: e });
    exByName.set(e.name, {
      id: created.id,
      kind: created.kind,
      muscleGroup: created.muscleGroup,
    });
  }
  console.log(`  ${EXERCISES.length} exercises`);

  // Routine
  const dayByName = new Map<string, number>();
  for (let i = 0; i < ROUTINE.length; i++) {
    const day = ROUTINE[i];
    const created = await prisma.routineDay.create({
      data: { name: day.name, dayOrder: i },
    });
    dayByName.set(day.name, created.id);
    for (let j = 0; j < day.exercises.length; j++) {
      const [exName, sets, reps] = day.exercises[j];
      const ex = exByName.get(exName)!;
      await prisma.routineExercise.create({
        data: {
          routineDayId: created.id,
          exerciseId: ex.id,
          order: j,
          targetSets: sets,
          targetReps: reps,
        },
      });
    }
  }
  console.log(`  ${ROUTINE.length} routine days`);

  // Viking with all stats at 0.
  const viking = await prisma.viking.create({ data: { name: "Ragnar" } });

  // --- Sample history (demo only) ---------------------------------------
  // A few weeks of Push/Pull/Legs with light progressive overload so the
  // graph trends upward and the calendar is populated.
  const xpTotals: Record<string, number> = {};

  async function logSession(
    dayName: string,
    when: Date,
    sets: { exercise: string; reps?: number; weight?: number; durationSec?: number }[],
  ) {
    const session = await prisma.workoutSession.create({
      data: { date: when, routineDayId: dayByName.get(dayName) ?? null },
    });
    let n = 1;
    for (const s of sets) {
      const ex = exByName.get(s.exercise)!;
      const xp = xpForSet({
        kind: ex.kind,
        reps: s.reps,
        weight: s.weight,
        durationSec: s.durationSec,
      });
      const stat = statForMuscleGroup(ex.muscleGroup);
      if (stat) xpTotals[stat] = (xpTotals[stat] ?? 0) + xp;
      await prisma.setLog.create({
        data: {
          sessionId: session.id,
          exerciseId: ex.id,
          setNumber: n++,
          reps: s.reps ?? null,
          weight: s.weight ?? null,
          durationSec: s.durationSec ?? null,
          xpAwarded: xp,
        },
      });
    }
  }

  // Three weeks, roughly PPL each week, bench/squat/deadlift creeping up.
  const weeks = [
    { off: 20, bench: 80, squat: 100, dead: 120, row: 60 },
    { off: 13, bench: 82.5, squat: 105, dead: 125, row: 62.5 },
    { off: 6, bench: 85, squat: 110, dead: 130, row: 65 },
  ];

  for (const w of weeks) {
    await logSession("Push", daysAgo(w.off), [
      { exercise: "Bench Press", reps: 6, weight: w.bench },
      { exercise: "Bench Press", reps: 6, weight: w.bench },
      { exercise: "Bench Press", reps: 5, weight: w.bench },
      { exercise: "Overhead Press", reps: 8, weight: w.bench * 0.6 },
      { exercise: "Incline Dumbbell Press", reps: 10, weight: 26 },
      { exercise: "Lateral Raise", reps: 15, weight: 10 },
      { exercise: "Triceps Pushdown", reps: 12, weight: 30 },
    ]);
    await logSession("Pull", daysAgo(w.off - 2), [
      { exercise: "Deadlift", reps: 5, weight: w.dead },
      { exercise: "Barbell Row", reps: 8, weight: w.row },
      { exercise: "Barbell Row", reps: 8, weight: w.row },
      { exercise: "Lat Pulldown", reps: 10, weight: 55 },
      { exercise: "Pull-up", reps: 8 },
      { exercise: "Barbell Curl", reps: 10, weight: 30 },
    ]);
    await logSession("Legs", daysAgo(w.off - 4), [
      { exercise: "Back Squat", reps: 6, weight: w.squat },
      { exercise: "Back Squat", reps: 6, weight: w.squat },
      { exercise: "Romanian Deadlift", reps: 8, weight: w.squat * 0.8 },
      { exercise: "Leg Press", reps: 12, weight: 160 },
      { exercise: "Leg Curl", reps: 12, weight: 45 },
      { exercise: "Standing Calf Raise", reps: 15, weight: 80 },
      { exercise: "Plank", durationSec: 60 },
    ]);
    await logSession("Conditioning", daysAgo(w.off - 5), [
      { exercise: "Running", durationSec: 25 * 60 },
      { exercise: "Rowing Machine", durationSec: 12 * 60 },
    ]);
  }

  // Persist the accumulated Viking XP.
  for (const [key, xp] of Object.entries(xpTotals)) {
    await prisma.vikingStat.create({ data: { vikingId: viking.id, key, xp } });
  }
  console.log(`  Viking "Ragnar" seeded with XP:`, xpTotals);

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
