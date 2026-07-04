"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
}

function blankRow(): SetRow {
  return { reps: "", weight: "", durationMin: "" };
}

export default function LogForm({
  days,
  preselectDayId,
}: {
  days: DayDef[];
  preselectDayId: number | null;
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
    buildInitialRows(initialDay),
  );
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState<
    { kind: "ok" | "error"; msg: string } | null
  >(null);

  const day = useMemo(
    () => days.find((d) => d.id === dayId) ?? null,
    [days, dayId],
  );

  // Auto-dismiss the toast.
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 4500);
    return () => clearTimeout(t);
  }, [flash]);

  const filledCount = useMemo(() => {
    if (!day) return 0;
    let n = 0;
    for (const ex of day.exercises) {
      for (const r of rows[ex.exerciseId] ?? []) {
        if (r.reps || r.durationMin) n++;
      }
    }
    return n;
  }, [day, rows]);

  function onChangeDay(id: number) {
    const next = days.find((d) => d.id === id) ?? null;
    setDayId(id);
    setRows(buildInitialRows(next));
    setFlash(null);
  }

  function updateRow(
    exerciseId: number,
    idx: number,
    field: keyof SetRow,
    value: string,
  ) {
    setRows((prev) => {
      const list = [...(prev[exerciseId] ?? [])];
      list[idx] = { ...list[idx], [field]: value };
      return { ...prev, [exerciseId]: list };
    });
  }

  function addSet(exerciseId: number) {
    setRows((prev) => {
      const list = prev[exerciseId] ?? [];
      // Start the new set prefilled with the previous set's numbers — at the
      // gym the next set is usually the same load.
      const last = list[list.length - 1];
      const next = last ? { ...last } : blankRow();
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
        const reps = r.reps ? Number(r.reps) : undefined;
        const weight = r.weight ? Number(r.weight) : undefined;
        const durationSec = r.durationMin
          ? Math.round(Number(r.durationMin) * 60)
          : undefined;
        if (!reps && !durationSec) return; // skip empty
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
      setFlash({ kind: "error", msg: "Add at least one set before saving." });
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
      setRows(buildInitialRows(day));
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
            {ex.cue && (
              <p className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                {ex.cue}
              </p>
            )}

            <div className={`field-cols${isCardio ? " cardio" : ""}`}>
              <span>Set</span>
              {isCardio ? (
                <span>Minutes</span>
              ) : (
                <>
                  <span>Reps</span>
                  {!isBodyweight && <span>kg</span>}
                </>
              )}
            </div>
            {list.map((r, i) => (
              <div className={`set-row${isCardio ? " cardio" : ""}`} key={i}>
                <span className="set-n">{i + 1}</span>
                {isCardio ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="–"
                    value={r.durationMin}
                    onChange={(e) =>
                      updateRow(ex.exerciseId, i, "durationMin", e.target.value)
                    }
                  />
                ) : (
                  <>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="–"
                      value={r.reps}
                      onChange={(e) =>
                        updateRow(ex.exerciseId, i, "reps", e.target.value)
                      }
                    />
                    {!isBodyweight && (
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="–"
                        value={r.weight}
                        onChange={(e) =>
                          updateRow(ex.exerciseId, i, "weight", e.target.value)
                        }
                      />
                    )}
                  </>
                )}
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

      <label className="field" style={{ margin: "4px 0 90px" }}>
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
            {filledCount} set{filledCount === 1 ? "" : "s"}
          </strong>
          {day?.name} · {date.slice(5)}
        </span>
        <button type="button" onClick={submit} disabled={submitting || filledCount === 0}>
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </>
  );
}

function buildInitialRows(day: DayDef | null): Record<number, SetRow[]> {
  const out: Record<number, SetRow[]> = {};
  if (!day) return out;
  for (const ex of day.exercises) {
    const n = ex.kind === "cardio" ? 1 : Math.max(1, ex.targetSets);
    out[ex.exerciseId] = Array.from({ length: n }, blankRow);
  }
  return out;
}
