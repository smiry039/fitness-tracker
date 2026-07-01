// Seed data — "Aesthetic Mass", Viking-bias full body 3×/week (Mon/Wed/Fri).
//
// This is the real program. Chest & back twice every session (heaviest first),
// delts every day, rear delts twice, legs minimal. Edit here and run
// `npm run db:reset` to change it. No fake workout history is seeded — the
// graph and calendar fill in as you log real sessions.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Kind = "weight" | "bodyweight" | "cardio";

interface ExDef {
  name: string;
  muscleGroup: string;
  kind: Kind;
}

// Master exercise list (deduplicated across days). muscleGroup drives which
// Viking stat the work feeds.
const EXERCISES: ExDef[] = [
  // Legs
  { name: "Barbell Back Squat", muscleGroup: "legs", kind: "weight" },
  { name: "Romanian Deadlift", muscleGroup: "legs", kind: "weight" },
  { name: "Leg Press / Bulgarian Split Squat", muscleGroup: "legs", kind: "weight" },
  { name: "Standing Calf Raise", muscleGroup: "calves", kind: "weight" },
  // Chest
  { name: "Flat DB / Barbell Press", muscleGroup: "chest", kind: "weight" },
  { name: "Incline DB Press", muscleGroup: "chest", kind: "weight" },
  { name: "Incline Barbell Press · 30°", muscleGroup: "chest", kind: "weight" },
  { name: "Weighted Dip / Flat DB Press", muscleGroup: "chest", kind: "weight" },
  { name: "Cable Fly · any angle", muscleGroup: "chest", kind: "weight" },
  // Back
  { name: "Lat Pulldown · wide", muscleGroup: "back", kind: "weight" },
  { name: "Chest-Supported / T-Bar Row", muscleGroup: "back", kind: "weight" },
  { name: "Weighted / Assisted Pull-up", muscleGroup: "back", kind: "weight" },
  { name: "Seated Cable Row", muscleGroup: "back", kind: "weight" },
  { name: "Seated Cable Row / Pulldown", muscleGroup: "back", kind: "weight" },
  { name: "Single-Arm DB Row", muscleGroup: "back", kind: "weight" },
  // Delts / rear delts
  { name: "Cable / DB Lateral Raise", muscleGroup: "delts", kind: "weight" },
  { name: "Face Pull · high rope", muscleGroup: "rear delt", kind: "weight" },
  { name: "Reverse Pec Deck", muscleGroup: "rear delt", kind: "weight" },
  // Arms
  { name: "Incline DB Curl", muscleGroup: "biceps", kind: "weight" },
  { name: "Cable Curl", muscleGroup: "biceps", kind: "weight" },
  { name: "DB Hammer Curl", muscleGroup: "arms", kind: "weight" },
  { name: "Cable Pushdown", muscleGroup: "triceps", kind: "weight" },
  { name: "Overhead Cable Triceps Ext", muscleGroup: "triceps", kind: "weight" },
  // Extras
  { name: "Neck · plate / harness", muscleGroup: "neck", kind: "weight" },
];

interface REDef {
  name: string;
  sets: number;
  reps: string;
  cue: string;
  optional?: boolean;
}

interface DayDef {
  name: string;
  focus: string;
  dayOfWeek: number; // 0=Sun .. 6=Sat
  exercises: REDef[];
}

const ROUTINE: DayDef[] = [
  {
    name: "Day A",
    focus: "Squat + flat bias",
    dayOfWeek: 1, // Monday
    exercises: [
      { name: "Barbell Back Squat", sets: 3, reps: "6–8", cue: "High-bar, controlled, a depth you fully own." },
      { name: "Flat DB / Barbell Press", sets: 3, reps: "8–10", cue: "Mid chest. Heaviest press while fresh." },
      { name: "Lat Pulldown · wide", sets: 3, reps: "8–10", cue: "Width. Drive elbows down, no swing." },
      { name: "Incline DB Press", sets: 3, reps: "10–12", cue: "Upper chest — second angle, lighter." },
      { name: "Chest-Supported / T-Bar Row", sets: 3, reps: "8–10", cue: "Thickness. Squeeze blades, no heave." },
      { name: "Cable / DB Lateral Raise", sets: 4, reps: "12–20", cue: "Slow, lead with elbows." },
      { name: "Face Pull · high rope", sets: 3, reps: "15–20", cue: "Caps the shoulder. Light, pause at the back." },
      { name: "Incline DB Curl", sets: 3, reps: "10–12", cue: "Long head — stretch behind the body." },
      { name: "Cable Pushdown", sets: 3, reps: "10–12", cue: "Shoulders locked, full lockout." },
      { name: "Standing Calf Raise", sets: 4, reps: "12–20", cue: "Pause at top, slow lower.", optional: true },
      { name: "Neck · plate / harness", sets: 2, reps: "15–20", cue: "If you feel like it. Light, slow, controlled.", optional: true },
    ],
  },
  {
    name: "Day B",
    focus: "Hinge + incline bias",
    dayOfWeek: 3, // Wednesday
    exercises: [
      { name: "Romanian Deadlift", sets: 3, reps: "8–10", cue: "Hinge, soft knees, stop before the back rounds." },
      { name: "Incline Barbell Press · 30°", sets: 3, reps: "6–8", cue: "Upper chest, heavy. Elbows ~45°." },
      { name: "Weighted / Assisted Pull-up", sets: 3, reps: "6–10", cue: "Width. Full stretch, chin over bar." },
      { name: "Weighted Dip / Flat DB Press", sets: 3, reps: "8–10", cue: "Lower/mid chest — second movement." },
      { name: "Seated Cable Row", sets: 3, reps: "8–10", cue: "Thickness. Elbows tucked, squeeze." },
      { name: "Cable / DB Lateral Raise", sets: 4, reps: "12–20", cue: "Every session. No exceptions." },
      { name: "DB Hammer Curl", sets: 3, reps: "12–15", cue: "Brachialis + forearms." },
      { name: "Overhead Cable Triceps Ext", sets: 3, reps: "10–12", cue: "Long head — stretch at the top." },
      { name: "Standing Calf Raise", sets: 4, reps: "12–20", cue: "Pause at top, slow lower.", optional: true },
      { name: "Neck · plate / harness", sets: 2, reps: "15–20", cue: "Optional, if it feels right on the day.", optional: true },
    ],
  },
  {
    name: "Day C",
    focus: "Mixed + pump",
    dayOfWeek: 5, // Friday
    exercises: [
      { name: "Leg Press / Bulgarian Split Squat", sets: 3, reps: "10–12", cue: "Leg volume without re-loading the spine." },
      { name: "Incline DB Press", sets: 3, reps: "8–10", cue: "Upper chest first while fresh." },
      { name: "Cable Fly · any angle", sets: 3, reps: "12–15", cue: "Stretch + squeeze. Second chest movement." },
      { name: "Seated Cable Row / Pulldown", sets: 3, reps: "8–10", cue: "Pick whichever you didn't lead with this week." },
      { name: "Single-Arm DB Row", sets: 3, reps: "10–12", cue: "Full stretch at the bottom, lower-lat focus." },
      { name: "Cable / DB Lateral Raise", sets: 4, reps: "12–20", cue: "Constant tension — cables shine here." },
      { name: "Reverse Pec Deck", sets: 3, reps: "15–20", cue: "Rear delts again — the 3D cap." },
      { name: "Cable Curl", sets: 3, reps: "12–15", cue: "Arm pump to finish." },
      { name: "Standing Calf Raise", sets: 4, reps: "12–20", cue: "Pause at top, slow lower.", optional: true },
      { name: "Neck · plate / harness", sets: 2, reps: "15–20", cue: "Optional finisher if you've got it in you.", optional: true },
    ],
  },
];

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
  console.log(`  ${ROUTINE.length} training days (A/B/C)`);

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
