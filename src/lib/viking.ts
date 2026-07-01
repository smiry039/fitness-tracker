// The Viking's growth engine.
//
// Every logged set feeds XP into exactly one stat, decided by the exercise's
// muscle group. Stats are intentionally few and thematic so they read like a
// character sheet, not a spreadsheet. Levels are derived from XP by a curve
// (below) so we can retune progression later without a migration.

export type StatKey = "vigour" | "will" | "might" | "sinew" | "heart";

export const STAT_KEYS: StatKey[] = ["vigour", "will", "might", "sinew", "heart"];

export interface StatMeta {
  key: StatKey;
  label: string;
  blurb: string;
  groups: string[]; // muscle groups that feed this stat
}

// The character sheet. Each stat maps to one or more training disciplines
// (the `muscleGroup` on an exercise). Every muscle group in the routine must
// appear here or its XP goes nowhere.
export const STAT_META: Record<StatKey, StatMeta> = {
  vigour: {
    key: "vigour",
    label: "Vigour",
    blurb: "Raw pushing power — chest and shoulders to break a shield wall.",
    groups: ["chest", "delts", "shoulders"],
  },
  will: {
    key: "will",
    label: "Will",
    blurb: "Pulling strength and grit — back, rear delts, the neck of an ox.",
    groups: ["back", "rear delt", "neck"],
  },
  might: {
    key: "might",
    label: "Might",
    blurb: "Foundation and lower-body power — legs and calves like oak.",
    groups: ["legs", "calves", "core"],
  },
  sinew: {
    key: "sinew",
    label: "Sinew",
    blurb: "Arm strength and grip — biceps and triceps for axe and oar.",
    groups: ["arms", "biceps", "triceps"],
  },
  heart: {
    key: "heart",
    label: "Heart",
    blurb: "Wind and endurance — the lungs to outlast any raid.",
    groups: ["cardio"],
  },
};

// Reverse lookup: muscle group -> stat.
const GROUP_TO_STAT: Record<string, StatKey> = (() => {
  const map: Record<string, StatKey> = {};
  for (const meta of Object.values(STAT_META)) {
    for (const group of meta.groups) map[group] = meta.key;
  }
  return map;
})();

export function statForMuscleGroup(muscleGroup: string): StatKey | null {
  return GROUP_TO_STAT[muscleGroup] ?? null;
}

// --- XP awarded for a single completed set -------------------------------

export interface SetInput {
  kind: string; // weight | bodyweight | cardio
  reps?: number | null;
  weight?: number | null; // kg
  durationSec?: number | null;
}

/**
 * XP for one set. Tuned so a normal working set is worth roughly 30-80 XP.
 * - weight:     volume (reps x kg) scaled down
 * - bodyweight: rewarded per rep
 * - cardio:     rewarded per minute
 */
export function xpForSet(set: SetInput): number {
  switch (set.kind) {
    case "weight": {
      const reps = set.reps ?? 0;
      const weight = set.weight ?? 0;
      return Math.round((reps * weight) / 20);
    }
    case "bodyweight": {
      const reps = set.reps ?? 0;
      return Math.round(reps * 3);
    }
    case "cardio": {
      const minutes = (set.durationSec ?? 0) / 60;
      return Math.round(minutes * 5);
    }
    default:
      return 0;
  }
}

// --- Level curve ---------------------------------------------------------

// Total XP required to *reach* a given level. Quadratic growth:
//   L1 = 0, L2 = 100, L3 = 300, L4 = 600, L5 = 1000 ...
export function xpToReachLevel(level: number): number {
  if (level <= 1) return 0;
  return 50 * level * (level - 1);
}

export interface LevelProgress {
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpForNextLevel: number; // span of the current level
  progress: number; // 0..1 toward next level
}

export function levelForXp(xp: number): LevelProgress {
  const safeXp = Math.max(0, Math.floor(xp));
  let level = 1;
  while (xpToReachLevel(level + 1) <= safeXp) level += 1;

  const floor = xpToReachLevel(level);
  const ceil = xpToReachLevel(level + 1);
  const span = ceil - floor;
  const into = safeXp - floor;

  return {
    level,
    xp: safeXp,
    xpIntoLevel: into,
    xpForNextLevel: span,
    progress: span > 0 ? into / span : 0,
  };
}

// --- Aggregate view ------------------------------------------------------

export interface VikingStatView extends LevelProgress {
  key: StatKey;
  label: string;
  blurb: string;
}

export interface VikingView {
  name: string;
  overallLevel: number;
  totalXp: number;
  stats: VikingStatView[];
}

/**
 * Build the full character view from raw {key -> xp} data. Any stat missing
 * from the input is treated as 0 XP so the sheet is always complete.
 */
export function buildVikingView(
  name: string,
  rawXp: Record<string, number>,
): VikingView {
  const stats: VikingStatView[] = STAT_KEYS.map((key) => {
    const meta = STAT_META[key];
    const prog = levelForXp(rawXp[key] ?? 0);
    return { key, label: meta.label, blurb: meta.blurb, ...prog };
  });

  const totalXp = stats.reduce((sum, s) => sum + s.xp, 0);

  return {
    name,
    overallLevel: levelForXp(totalXp).level,
    totalXp,
    stats,
  };
}
