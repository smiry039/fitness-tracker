// Data-access layer. Both the API routes and the server components call these
// helpers so the query + XP logic lives in exactly one place.

import { prisma } from "@/lib/prisma";
import {
  buildVikingView,
  statForMuscleGroup,
  xpForSet,
  type VikingView,
} from "@/lib/viking";

// --- Routine -------------------------------------------------------------

export async function getRoutine() {
  return prisma.routineDay.findMany({
    orderBy: { dayOrder: "asc" },
    include: {
      exercises: {
        orderBy: { order: "asc" },
        include: { exercise: true },
      },
    },
  });
}

export async function getRoutineDay(id: number) {
  return prisma.routineDay.findUnique({
    where: { id },
    include: {
      exercises: {
        orderBy: { order: "asc" },
        include: { exercise: true },
      },
    },
  });
}

/**
 * Suggest today's training day. If a day is scheduled for today's weekday, use
 * it. Otherwise fall back to whatever follows the most recently logged day in
 * the split rotation, then to the first day.
 */
export async function getSuggestedDay() {
  const days = await getRoutine();
  if (days.length === 0) return null;

  const todayDow = new Date().getDay(); // 0=Sun..6=Sat
  const scheduled = days.find((d) => d.dayOfWeek === todayDow);
  if (scheduled) return scheduled;

  const lastSession = await prisma.workoutSession.findFirst({
    where: { routineDayId: { not: null } },
    orderBy: { date: "desc" },
  });

  if (!lastSession?.routineDayId) return days[0];

  const idx = days.findIndex((d) => d.id === lastSession.routineDayId);
  if (idx === -1) return days[0];
  return days[(idx + 1) % days.length];
}

// --- Exercises -----------------------------------------------------------

export async function getExercises() {
  return prisma.exercise.findMany({ orderBy: { name: "asc" } });
}

// --- Sessions ------------------------------------------------------------

export interface LoggedSet {
  exerciseId: number;
  setNumber?: number;
  reps?: number | null;
  weight?: number | null;
  durationSec?: number | null;
}

export interface CreateSessionInput {
  routineDayId?: number | null;
  date?: string | Date | null;
  notes?: string | null;
  sets: LoggedSet[];
}

export interface CreateSessionResult {
  sessionId: number;
  totalXp: number;
  xpByStat: Record<string, number>;
}

/**
 * Persist a workout and grant the Viking XP. Each set's XP is computed from the
 * exercise's `kind`, then routed to a stat via its muscle group. Runs in one
 * transaction so a session and its XP never drift apart.
 */
export async function createSession(
  input: CreateSessionInput,
): Promise<CreateSessionResult> {
  const cleanSets = input.sets.filter((s) => {
    const hasReps = (s.reps ?? 0) > 0;
    const hasDuration = (s.durationSec ?? 0) > 0;
    return hasReps || hasDuration;
  });

  if (cleanSets.length === 0) {
    throw new Error("A workout needs at least one completed set.");
  }

  const exerciseIds = [...new Set(cleanSets.map((s) => s.exerciseId))];
  const exercises = await prisma.exercise.findMany({
    where: { id: { in: exerciseIds } },
  });
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));

  // Pre-compute XP so we can write set rows and stat totals together.
  const xpByStat: Record<string, number> = {};
  const setRows = cleanSets.map((s, i) => {
    const exercise = exerciseById.get(s.exerciseId);
    if (!exercise) throw new Error(`Unknown exercise id ${s.exerciseId}`);

    const xp = xpForSet({
      kind: exercise.kind,
      reps: s.reps,
      weight: s.weight,
      durationSec: s.durationSec,
    });

    const stat = statForMuscleGroup(exercise.muscleGroup);
    if (stat) xpByStat[stat] = (xpByStat[stat] ?? 0) + xp;

    return {
      exerciseId: s.exerciseId,
      setNumber: s.setNumber ?? i + 1,
      reps: s.reps ?? null,
      weight: s.weight ?? null,
      durationSec: s.durationSec ?? null,
      xpAwarded: xp,
    };
  });

  const totalXp = Object.values(xpByStat).reduce((a, b) => a + b, 0);

  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.workoutSession.create({
      data: {
        date: input.date ? new Date(input.date) : new Date(),
        routineDayId: input.routineDayId ?? null,
        notes: input.notes ?? null,
        sets: { create: setRows },
      },
    });

    // Route XP into the (single) Viking. Create stats lazily on first use.
    const viking = await tx.viking.findFirst();
    if (viking) {
      for (const [key, xp] of Object.entries(xpByStat)) {
        if (xp === 0) continue;
        const existing = await tx.vikingStat.findUnique({
          where: { vikingId_key: { vikingId: viking.id, key } },
        });
        if (existing) {
          await tx.vikingStat.update({
            where: { id: existing.id },
            data: { xp: existing.xp + xp },
          });
        } else {
          await tx.vikingStat.create({
            data: { vikingId: viking.id, key, xp },
          });
        }
      }
    }

    return created;
  });

  return { sessionId: session.id, totalXp, xpByStat };
}

export async function getRecentSessions(limit = 20) {
  return prisma.workoutSession.findMany({
    orderBy: { date: "desc" },
    take: limit,
    include: {
      routineDay: true,
      sets: { include: { exercise: true } },
    },
  });
}

export async function getSessionsForMonth(year: number, month: number) {
  // month is 1-12
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return prisma.workoutSession.findMany({
    where: { date: { gte: start, lt: end } },
    orderBy: { date: "asc" },
    include: {
      routineDay: true,
      sets: true,
    },
  });
}

// --- Viking --------------------------------------------------------------

export async function getViking(): Promise<VikingView> {
  const viking = await prisma.viking.findFirst({ include: { stats: true } });
  if (!viking) return buildVikingView("Ragnar", {});

  const rawXp: Record<string, number> = {};
  for (const s of viking.stats) rawXp[s.key] = s.xp;
  return buildVikingView(viking.name, rawXp);
}

// --- Graph / progress ----------------------------------------------------

export interface ProgressPoint {
  date: string; // ISO date (yyyy-mm-dd)
  topWeight: number; // heaviest set that session
  estimated1RM: number; // best Epley e1RM that session
  totalVolume: number; // sum(reps x weight) that session
}

// Epley estimated one-rep max.
function epley(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

/**
 * Per-session progress series for one exercise, oldest first. Only meaningful
 * for weighted lifts, but harmless for others (weights default to 0).
 */
export async function getExerciseProgress(
  exerciseId: number,
): Promise<ProgressPoint[]> {
  const sets = await prisma.setLog.findMany({
    where: { exerciseId },
    include: { session: true },
    orderBy: { session: { date: "asc" } },
  });

  const bySession = new Map<
    number,
    { date: Date; topWeight: number; e1rm: number; volume: number }
  >();

  for (const s of sets) {
    const reps = s.reps ?? 0;
    const weight = s.weight ?? 0;
    const key = s.sessionId;
    const entry =
      bySession.get(key) ??
      { date: s.session.date, topWeight: 0, e1rm: 0, volume: 0 };

    entry.topWeight = Math.max(entry.topWeight, weight);
    entry.e1rm = Math.max(entry.e1rm, epley(weight, reps));
    entry.volume += reps * weight;
    bySession.set(key, entry);
  }

  return [...bySession.values()]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((e) => ({
      date: e.date.toISOString().slice(0, 10),
      topWeight: Math.round(e.topWeight * 10) / 10,
      estimated1RM: Math.round(e.e1rm * 10) / 10,
      totalVolume: Math.round(e.volume),
    }));
}
