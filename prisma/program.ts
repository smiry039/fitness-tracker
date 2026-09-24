// The training program — shared by `seed.ts` (fresh database) and
// `sync-routine.ts` (update a live database without touching logged history).
//
// Current block: "Balanced Hypertrophy" (Day 1/2/3, Mon/Wed/Fri). Legs lead
// every session, arms get direct work every day (superset to save time), chest
// and back drop to one movement each per session. ~7 exercises per day.
//
// The previous "Aesthetic Mass" block (Day A/B/C) is kept as unscheduled
// alternatives: still loggable, never auto-suggested.

export type Kind = "weight" | "bodyweight" | "cardio";

export interface ExDef {
  name: string;
  muscleGroup: string;
  kind: Kind;
}

// Master exercise list (deduplicated across days). muscleGroup drives which
// Viking stat the work feeds. Never rename an entry — logged sets reference it.
export const EXERCISES: ExDef[] = [
  // Legs
  { name: "Barbell Back Squat", muscleGroup: "legs", kind: "weight" },
  { name: "Romanian Deadlift", muscleGroup: "legs", kind: "weight" },
  { name: "Leg Press / Bulgarian Split Squat", muscleGroup: "legs", kind: "weight" },
  { name: "Leg Press", muscleGroup: "legs", kind: "weight" },
  { name: "Leg Extension", muscleGroup: "legs", kind: "weight" },
  { name: "Hip Thrust · Smith / barbell", muscleGroup: "legs", kind: "weight" },
  { name: "DB Bulgarian Split Squat", muscleGroup: "legs", kind: "weight" },
  { name: "Lying Leg Curl", muscleGroup: "legs", kind: "weight" },
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
  { name: "Seated DB Curl", muscleGroup: "biceps", kind: "weight" },
  { name: "Incline DB Curl", muscleGroup: "biceps", kind: "weight" },
  { name: "Cable Curl", muscleGroup: "biceps", kind: "weight" },
  { name: "DB Hammer Curl", muscleGroup: "arms", kind: "weight" },
  { name: "Cable Pushdown", muscleGroup: "triceps", kind: "weight" },
  { name: "Overhead Cable Triceps Ext", muscleGroup: "triceps", kind: "weight" },
  // Extras
  { name: "Neck · plate / harness", muscleGroup: "neck", kind: "weight" },
];

export interface REDef {
  name: string;
  sets: number;
  reps: string;
  cue: string;
  optional?: boolean;
}

export interface DayDef {
  name: string; // unique — used to match days when syncing a live database
  focus: string;
  dayOfWeek: number | null; // 0=Sun .. 6=Sat; null = alternative, not suggested
  exercises: REDef[];
}

export const ROUTINE: DayDef[] = [
  // --- Current block: Balanced Hypertrophy ---------------------------------
  {
    name: "Day 1",
    focus: "Quads + arms",
    dayOfWeek: 1, // Monday
    exercises: [
      { name: "Leg Press", sets: 3, reps: "8–12", cue: "Feet mid-plate, deep as the lower back stays flat. Quads first while fresh." },
      { name: "Leg Extension", sets: 3, reps: "12–15", cue: "Pause at the top, slow lower. Pure quad." },
      { name: "Incline DB Press", sets: 3, reps: "8–12", cue: "Only chest today — push every set." },
      { name: "Lat Pulldown · wide", sets: 3, reps: "8–12", cue: "Width. Drive elbows down, no swing." },
      { name: "Cable / DB Lateral Raise", sets: 3, reps: "8–10", cue: "Slow, lead with elbows." },
      { name: "Seated DB Curl", sets: 3, reps: "10–12", cue: "Superset with triceps ext. Full stretch, no swing." },
      { name: "Overhead Cable Triceps Ext", sets: 3, reps: "10–12", cue: "Superset with curl. Long head — deep stretch at the top." },
    ],
  },
  {
    name: "Day 2",
    focus: "Glutes + hamstrings",
    dayOfWeek: 3, // Wednesday
    exercises: [
      { name: "Hip Thrust · Smith / barbell", sets: 3, reps: "8–12", cue: "Chin tucked, ribs down, 1s squeeze at the top. Glutes, not lower back." },
      { name: "Romanian Deadlift", sets: 3, reps: "8–10", cue: "Hinge, soft knees, stop before the back rounds. Builds the lower back too." },
      { name: "Flat DB / Barbell Press", sets: 3, reps: "8–12", cue: "Only chest today — push every set." },
      { name: "Seated Cable Row", sets: 3, reps: "8–12", cue: "Thickness. Elbows tucked, squeeze." },
      { name: "Cable / DB Lateral Raise", sets: 3, reps: "8–10", cue: "Every session. No exceptions." },
      { name: "DB Hammer Curl", sets: 3, reps: "10–12", cue: "Superset with pushdown. Brachialis + forearms." },
      { name: "Cable Pushdown", sets: 3, reps: "10–12", cue: "Superset with curl. Shoulders locked, full lockout." },
    ],
  },
  {
    name: "Day 3",
    focus: "Balanced",
    dayOfWeek: 5, // Friday
    exercises: [
      { name: "DB Bulgarian Split Squat", sets: 3, reps: "8–12", cue: "Per leg. Longer stride + lean = glutes, shorter + upright = quads." },
      { name: "Lying Leg Curl", sets: 3, reps: "10–15", cue: "Hips pinned, slow lower." },
      { name: "Weighted Dip / Flat DB Press", sets: 3, reps: "6–10", cue: "Lean forward for chest. Add weight once 3×10 is easy." },
      { name: "Weighted / Assisted Pull-up", sets: 3, reps: "5–8", cue: "Use assistance to hit the reps. Full stretch, chin over bar." },
      { name: "Cable / DB Lateral Raise", sets: 3, reps: "8–10", cue: "Constant tension — cables shine here." },
      { name: "Cable Curl", sets: 3, reps: "10–12", cue: "Superset with triceps ext." },
      { name: "Overhead Cable Triceps Ext", sets: 3, reps: "10–12", cue: "Superset with curl. Long head — deep stretch at the top." },
    ],
  },

  // --- Previous block: Aesthetic Mass (alternatives, not scheduled) ---------
  {
    name: "Day A",
    focus: "Aesthetic Mass · squat + flat bias",
    dayOfWeek: null,
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
    focus: "Aesthetic Mass · hinge + incline bias",
    dayOfWeek: null,
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
    focus: "Aesthetic Mass · mixed + pump",
    dayOfWeek: null,
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
