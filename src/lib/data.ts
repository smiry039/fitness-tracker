// Data-access layer. Both the API routes and the server components call these
// helpers so the query + XP logic lives in exactly one place.

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  buildVikingView,
  statForMuscleGroup,
  xpForSet,
  type VikingView,
} from "@/lib/viking";

// --- Routine -------------------------------------------------------------

// The routine only changes when the seed is re-run, but it's read on almost
// every screen. Cache it server-side so page renders don't pay a DB round
// trip for data that's identical for days at a time.
export const getRoutine = unstable_cache(
  async () =>
    prisma.routineDay.findMany({
      orderBy: { dayOrder: "asc" },
      include: {
        exercises: {
          orderBy: { order: "asc" },
          include: { exercise: true },
        },
      },
    }),
  ["routine-v1"],
  { revalidate: 300, tags: ["routine"] },
);

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

type RoutineDays = Awaited<ReturnType<typeof getRoutine>>;

/**
 * Suggest today's training day. If a day is scheduled for today's weekday, use
 * it. Otherwise fall back to whatever follows the most recently logged day in
 * the split rotation, then to the first day. Pass the routine in if the caller
 * already fetched it, to avoid a duplicate query.
 */
export async function getSuggestedDay(routine?: RoutineDays) {
  const days = routine ?? (await getRoutine());
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

export const getExercises = unstable_cache(
  async () => prisma.exercise.findMany({ orderBy: { name: "asc" } }),
  ["exercises-v1"],
  { revalidate: 300, tags: ["routine"] },
);

// --- Last performance ------------------------------------------------------

export interface LastSet {
  reps: number | null;
  weight: number | null;
  durationSec: number | null;
}

/**
 * For each exercise, the sets from the most recent session it appeared in —
 * used to prefill the log form so a repeat performance is a single tap, and
 * to show "last time" next to each lift. One query for the whole day.
 */
export async function getLastSetsForExercises(
  exerciseIds: number[],
): Promise<Record<number, LastSet[]>> {
  if (exerciseIds.length === 0) return {};

  const logs = await prisma.setLog.findMany({
    where: { exerciseId: { in: exerciseIds } },
    select: {
      exerciseId: true,
      sessionId: true,
      setNumber: true,
      reps: true,
      weight: true,
      durationSec: true,
      session: { select: { date: true } },
    },
    orderBy: [{ session: { date: "desc" } }, { setNumber: "asc" }],
    take: 600,
  });

  const latestSession = new Map<number, number>();
  const out: Record<number, LastSet[]> = {};
  for (const log of logs) {
    const seen = latestSession.get(log.exerciseId);
    if (seen === undefined) latestSession.set(log.exerciseId, log.sessionId);
    else if (seen !== log.sessionId) continue; // older session — skip
    (out[log.exerciseId] ??= []).push({
      reps: log.reps,
      weight: log.weight,
      durationSec: log.durationSec,
    });
  }
  return out;
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
