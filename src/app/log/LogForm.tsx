"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LastSet } from "@/lib/data";

// The logging flow is built around one observation: most sets repeat last
// session's numbers (or nudge them slightly). So every set arrives prefilled
// from your last performance and logging it is a single tap on the ✓. The
// steppers cover "one more rep / 2.5 kg up" without the keyboard; tapping the
// number still lets you type for big jumps.

interface ExerciseDef {
  exerciseId: number;
  name: string;
  kind: string;
  muscleGroup: string;
  targetSets: number;
  targetReps: string;
  cue?: string | null;
  optional?: boolean;
}

interface DayDef {
  id: number;
  name: string;
  focus?: string | null;
  dayOfWeek?: number | null;
  exercises: ExerciseDef[];
}

interface SetRow {
  reps: string;
  weight: string;
  durationMin: string;
  done: boolean;
}

const WEIGHT_STEP = 2.5;

function Stepper({
  value,
  onChange,
  step,
  inputMode,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  step: number;
  inputMode: "numeric" | "decimal";
  label: string;
}) {
  function nudge(dir: 1 | -1) {
    const n = Number(value) || 0;
    const next = Math.max(0, Math.round((n + dir * step) * 100) / 100);
    onChange(next === 0 ? "" : String(next));
  }
  return (
    <div className="stepper">
      <button type="button" aria-label={`${label} down`} onClick={() => nudge(-1)}>
        −
      </button>
      <input
        type="text"
        inputMode={inputMode}
        placeholder="–"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" aria-label={`${label} up`} onClick={() => nudge(1)}>
        +
      </button>
    </div>
  );
}

export default function LogForm({
  days,
  preselectDayId,
  lastSets,
}: {
  days: DayDef[];
  preselectDayId: number | null;
  lastSets: Record<number, LastSet[]>;
}) {
  const router = useRouter();

  // Prefer the explicit ?day=, then today's scheduled day, then the first.
  const initialDay =
    days.find((d) => d.id === preselectDayId) ??
    days.find((d) => d.dayOfWeek === new Date().getDay()) ??
    days[0] ??
    null;

  const [dayId, setDayId] = useState<number | null>(initialDay?.id ?? null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Record<number, SetRow[]>>(() =>
    buildInitialRows(initialDay, lastSets),
  );
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState<
    { kind: "ok" | "error"; msg: string } | null
  >(null);

  const day = useMemo(
    () => days.find((d) => d.id === dayId) ?? null,
    [days, dayId],
  );

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 4500);
    return () => clearTimeout(t);
  }, [flash]);

  const doneCount = useMemo(() => {
    if (!day) return 0;
    let n = 0;
    for (const ex of day.exercises) {
      for (const r of rows[ex.exerciseId] ?? []) if (r.done) n++;
    }
    return n;
  }, [day, rows]);

  function onChangeDay(id: number) {
    const next = days.find((d) => d.id === id) ?? null;
    setDayId(id);
    setRows(buildInitialRows(next, lastSets));
    setFlash(null);
  }

  function updateRow(exerciseId: number, idx: number, patch: Partial<SetRow>) {
    setRows((prev) => {
      const list = [...(prev[exerciseId] ?? [])];
      list[idx] = { ...list[idx], ...patch };
      return { ...prev, [exerciseId]: list };
    });
  }

  // Editing a value implies you did (or are doing) the set — mark it done so
  // the common flow never needs the checkbox at all.
  function editValue(
    exerciseId: number,
    idx: number,
    field: "reps" | "weight" | "durationMin",
    value: string,
  ) {
    updateRow(exerciseId, idx, { [field]: value, done: true } as Partial<SetRow>);
  }

  function addSet(exerciseId: number) {
    setRows((prev) => {
      const list = prev[exerciseId] ?? [];
      const last = list[list.length - 1];
      const next: SetRow = last
        ? { ...last, done: true }
        : { reps: "", weight: "", durationMin: "", done: true };
      return { ...prev, [exerciseId]: [...list, next] };
    });
  }

  async function submit() {
    if (!day) return;
    setSubmitting(true);
    setFlash(null);

    const sets: {
      exerciseId: number;
      setNumber: number;
      reps?: number;
      weight?: number;
      durationSec?: number;
    }[] = [];

    for (const ex of day.exercises) {
      const list = rows[ex.exerciseId] ?? [];
      list.forEach((r, i) => {
        if (!r.done) return;
        const reps = r.reps ? Number(r.reps) : undefined;
        const weight = r.weight ? Number(r.weight) : undefined;
        const durationSec = r.durationMin
          ? Math.round(Number(r.durationMin) * 60)
          : undefined;
        if (!reps && !durationSec) return;
        sets.push({
          exerciseId: ex.exerciseId,
          setNumber: i + 1,
          reps,
          weight,
          durationSec,
        });
      });
    }

    if (sets.length === 0) {
      setFlash({ kind: "error", msg: "Tick the sets you completed first." });
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routineDayId: day.id,
          date,
          notes: notes || null,
          sets,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");

      const parts = Object.entries(data.xpByStat ?? {})
        .map(([k, v]) => `${k} +${v}`)
        .join(" · ");
      setFlash({
        kind: "ok",
        msg: `⚔ Saved! +${data.totalXp} XP${parts ? ` — ${parts}` : ""}`,
      });
      // Keep the numbers (they're now "last time") but clear the ticks.
      setRows((prev) => {
        const out: Record<number, SetRow[]> = {};
        for (const [k, list] of Object.entries(prev)) {
          out[Number(k)] = list.map((r) => ({ ...r, done: false }));
        }
        return out;
      });
      setNotes("");
      router.refresh();
    } catch (e) {
      setFlash({
        kind: "error",
        msg: e instanceof Error ? e.message : "Something went wrong.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (days.length === 0) {
    return (
      <div className="card">
        No routine defined yet. Seed one with <code>npm run db:reset</code>.
      </div>
    );
  }

  return (
    <>
      <div className="pills" style={{ marginBottom: 12 }} role="group" aria-label="Training day">
        {days.map((d) => (
          <button
            key={d.id}
            type="button"
            className="pill"
            aria-pressed={d.id === dayId}
            onClick={() => onChangeDay(d.id)}
          >
            {d.name}
          </button>
        ))}
      </div>

      <label className="field" style={{ marginBottom: 16 }}>
        <span>Date</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>

      {day?.exercises.map((ex) => {
        const isCardio = ex.kind === "cardio";
        const isBodyweight = ex.kind === "bodyweight";
        const list = rows[ex.exerciseId] ?? [];
        const last = lastSets[ex.exerciseId];
        const lastLabel = last?.length
          ? isCardio
            ? `${Math.round((last[0].durationSec ?? 0) / 60)} min`
            : last
                .map((s) =>
                  s.weight ? `${s.reps}×${s.weight}` : `${s.reps ?? "–"}`,
                )
                .join(" · ")
          : null;

        return (
          <div className="card" key={ex.exerciseId}>
            <div className="card-head">
              <span className="card-title">
                {ex.optional && <span className="badge">Extra</span>}{" "}
                {ex.name}
              </span>
              <span className="reps" style={{ flexShrink: 0 }}>
                {ex.targetSets} × {ex.targetReps}
              </span>
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 3 }}>
              {lastLabel ? (
                <>
                  <span style={{ color: "var(--copper)" }}>Last:</span>{" "}
                  {lastLabel}
                </>
              ) : (
                ex.cue
              )}
            </p>

            <div className={`field-cols${isCardio ? " cardio" : ""}`}>
              <span />
              {isCardio ? (
                <span>Minutes</span>
              ) : (
                <>
                  <span>Reps</span>
                  {!isBodyweight && <span>kg</span>}
                </>
              )}
              <span>Done</span>
            </div>
            {list.map((r, i) => (
              <div
                className={`set-row${isCardio ? " cardio" : ""}${r.done ? " is-done" : ""}`}
                key={i}
              >
                <span className="set-n">{i + 1}</span>
                {isCardio ? (
                  <Stepper
                    value={r.durationMin}
                    step={1}
                    inputMode="decimal"
                    label={`Set ${i + 1} minutes`}
                    onChange={(v) => editValue(ex.exerciseId, i, "durationMin", v)}
                  />
                ) : (
                  <>
                    <Stepper
                      value={r.reps}
                      step={1}
                      inputMode="numeric"
                      label={`Set ${i + 1} reps`}
                      onChange={(v) => editValue(ex.exerciseId, i, "reps", v)}
                    />
                    {!isBodyweight && (
                      <Stepper
                        value={r.weight}
                        step={WEIGHT_STEP}
                        inputMode="decimal"
                        label={`Set ${i + 1} weight`}
                        onChange={(v) => editValue(ex.exerciseId, i, "weight", v)}
                      />
                    )}
                  </>
                )}
                <button
                  type="button"
                  className="check"
                  aria-pressed={r.done}
                  aria-label={`Set ${i + 1} done`}
                  onClick={() => updateRow(ex.exerciseId, i, { done: !r.done })}
                >
                  ✓
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn-ghost btn-block"
              style={{ marginTop: 12 }}
              onClick={() => addSet(ex.exerciseId)}
            >
              + Add set
            </button>
          </div>
        );
      })}

      <label className="field" style={{ margin: "4px 0 110px" }}>
        <span>Notes (optional)</span>
        <textarea
          style={{ minHeight: 64, fontFamily: "var(--font-body)" }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      {flash && (
        <div className={`toast${flash.kind === "error" ? " error" : ""}`} role="status">
          {flash.msg}
        </div>
      )}

      <div className="savebar">
        <span className="count">
          <strong>
            {doneCount} set{doneCount === 1 ? "" : "s"} ✓
          </strong>
          {day?.name} · {date.slice(5)}
        </span>
        <button type="button" onClick={submit} disabled={submitting || doneCount === 0}>
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </>
  );
}

function buildInitialRows(
  day: DayDef | null,
  lastSets: Record<number, LastSet[]>,
): Record<number, SetRow[]> {
  const out: Record<number, SetRow[]> = {};
  if (!day) return out;
  for (const ex of day.exercises) {
    const last = lastSets[ex.exerciseId] ?? [];
    const n =
      ex.kind === "cardio"
        ? 1
        : Math.max(1, ex.targetSets, Math.min(last.length, 8));
    out[ex.exerciseId] = Array.from({ length: n }, (_, i) => {
      // Prefill from the matching set last time, falling back to the last
      // set you did (sets beyond last session's count repeat the final one).
      const src = last[i] ?? last[last.length - 1];
      return {
        reps: src?.reps != null ? String(src.reps) : "",
        weight: src?.weight != null ? String(src.weight) : "",
        durationMin:
          src?.durationSec != null ? String(Math.round(src.durationSec / 60)) : "",
        done: false,
      };
    });
  }
  return out;
}
