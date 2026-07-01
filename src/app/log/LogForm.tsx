"use client";

import { useMemo, useState } from "react";
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

  const initialDay =
    days.find((d) => d.id === preselectDayId) ?? days[0] ?? null;

  const [dayId, setDayId] = useState<number | null>(initialDay?.id ?? null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  // rows keyed by exerciseId
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
    setRows((prev) => ({
      ...prev,
      [exerciseId]: [...(prev[exerciseId] ?? []), blankRow()],
    }));
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
        .join(", ");
      setFlash({
        kind: "ok",
        msg: `Saved! +${data.totalXp} XP${parts ? ` (${parts})` : ""}.`,
      });
      setRows(buildInitialRows(day));
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
      <div className="panel">
        No routine defined yet. Seed one with <code>npm run db:reset</code>.
      </div>
    );
  }

  return (
    <>
      {flash && (
        <div className={`flash${flash.kind === "error" ? " error" : ""}`}>
          {flash.msg}
        </div>
      )}

      <div className="panel">
        <div
          style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}
        >
          <label>
            Day{" "}
            <select
              value={dayId ?? ""}
              onChange={(e) => onChangeDay(Number(e.target.value))}
            >
              {days.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date{" "}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>
      </div>

      {day?.exercises.map((ex) => {
        const isCardio = ex.kind === "cardio";
        const isBodyweight = ex.kind === "bodyweight";
        const list = rows[ex.exerciseId] ?? [];
        return (
          <div className="panel" key={ex.exerciseId}>
            <div
              style={{ display: "flex", justifyContent: "space-between", gap: 8 }}
            >
              <strong>
                {ex.optional && <span className="badge">Extra</span>} {ex.name}
              </strong>
              <span className="badge">
                {ex.muscleGroup} · target {ex.targetSets} × {ex.targetReps}
              </span>
            </div>
            {ex.cue && (
              <p className="muted" style={{ margin: "4px 0 0", fontSize: 12 }}>
                {ex.cue}
              </p>
            )}
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>Set</th>
                  {isCardio ? (
                    <th>Minutes</th>
                  ) : (
                    <>
                      <th>Reps</th>
                      {!isBodyweight && <th>Weight (kg)</th>}
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {list.map((r, i) => (
                  <tr key={i}>
                    <td className="muted">{i + 1}</td>
                    {isCardio ? (
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={r.durationMin}
                          onChange={(e) =>
                            updateRow(ex.exerciseId, i, "durationMin", e.target.value)
                          }
                        />
                      </td>
                    ) : (
                      <>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={r.reps}
                            onChange={(e) =>
                              updateRow(ex.exerciseId, i, "reps", e.target.value)
                            }
                          />
                        </td>
                        {!isBodyweight && (
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={r.weight}
                              onChange={(e) =>
                                updateRow(ex.exerciseId, i, "weight", e.target.value)
                              }
                            />
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              className="secondary"
              onClick={() => addSet(ex.exerciseId)}
            >
              + Add set
            </button>
          </div>
        );
      })}

      <div className="panel">
        <label style={{ display: "block", marginBottom: 10 }}>
          Notes (optional)
          <br />
          <textarea
            style={{ width: "100%", minHeight: 60, marginTop: 4 }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <button type="button" onClick={submit} disabled={submitting}>
          {submitting ? "Saving…" : "Save workout"}
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
