"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LastSet } from "@/lib/data";
import { ArrowRightIcon, CheckIcon, ChevronIcon, Ring } from "../ui";
import Wheel from "./Wheel";

// Workout flow. Before starting you arrange the day's exercises (the order is
// remembered per day). During the workout the screen shows one set at a time
// with big scroll wheels, then a rest timer, then the next set. Supersets
// (adjacent exercises whose cue starts with "Superset") alternate set by set
// with no rest between partners. Progress is kept in localStorage so a reload
// or a locked phone never loses a workout.

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

interface Row {
  reps: string;
  weight: string;
  durationMin: string;
  done: boolean;
}

interface Step {
  exerciseId: number;
  set: number; // 0-based
}

interface Active {
  v: 1;
  dayId: number;
  date: string;
  order: number[];
  rows: Record<number, Row[]>;
  step: number;
  startedAt: number;
  restEndsAt: number | null;
  restTotal: number;
  notes: string;
}

type Phase = "set" | "rest" | "flow" | "finish" | "saved";

const ACTIVE_KEY = "workout:v1";
const REST_KEY = "rest:v1";
const flowKey = (dayId: number) => `flow:v1:${dayId}`;

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function store(key: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota — the workout still works, just isn't persisted */
  }
}

function localDateISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const isSuperset = (ex?: ExerciseDef) => !!ex?.cue?.toLowerCase().startsWith("superset");

/** Adjacent superset exercises form a group; everything else is a group of one. */
function groupsFor(order: number[], byId: Map<number, ExerciseDef>): number[][] {
  const groups: number[][] = [];
  for (const id of order) {
    const last = groups[groups.length - 1];
    const prevId = last?.[last.length - 1];
    if (last && isSuperset(byId.get(id)) && isSuperset(byId.get(prevId!))) last.push(id);
    else groups.push([id]);
  }
  return groups;
}

function stepsFor(groups: number[][], rows: Record<number, Row[]>): Step[] {
  const steps: Step[] = [];
  for (const g of groups) {
    const n = Math.max(...g.map((id) => rows[id]?.length ?? 0));
    for (let s = 0; s < n; s++)
      for (const id of g) if (s < (rows[id]?.length ?? 0)) steps.push({ exerciseId: id, set: s });
  }
  return steps;
}

function mergeOrder(saved: number[] | null, day: DayDef): number[] {
  const ids = day.exercises.map((e) => e.exerciseId);
  if (!saved) return ids;
  const kept = saved.filter((id) => ids.includes(id));
  return [...kept, ...ids.filter((id) => !kept.includes(id))];
}

function fmtClock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function describeSet(r: Row | LastSet | undefined, kind: string): string {
  if (!r) return "–";
  if (kind === "cardio") {
    const min = "durationSec" in r ? Math.round((r.durationSec ?? 0) / 60) : Number(r.durationMin);
    return `${min} min`;
  }
  const w = Number(r.weight) || 0;
  return w ? `${w} kg × ${r.reps ?? "–"}` : `${r.reps ?? "–"} reps`;
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

  const initialDay =
    days.find((d) => d.id === preselectDayId) ??
    days.find((d) => d.dayOfWeek === new Date().getDay()) ??
    days.find((d) => d.dayOfWeek != null) ??
    days[0] ??
    null;

  const [dayId, setDayId] = useState<number | null>(initialDay?.id ?? null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [order, setOrder] = useState<number[]>(() => (initialDay ? mergeOrder(null, initialDay) : []));
  const [active, setActive] = useState<Active | null>(null);
  const [phase, setPhase] = useState<Phase>("set");
  const [restDefault, setRestDefault] = useState(90);
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ totalXp: number; xpByStat: Record<string, number> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumable, setResumable] = useState<Active | null>(null);

  const day = useMemo(() => days.find((d) => d.id === dayId) ?? null, [days, dayId]);

  // Client-only state: local date, saved flow order, rest length, and any
  // workout left in progress.
  useEffect(() => {
    setDate(localDateISO());
    setRestDefault(load<number>(REST_KEY) ?? 90);
    const saved = load<Active>(ACTIVE_KEY);
    if (saved?.v === 1 && days.some((d) => d.id === saved.dayId)) setResumable(saved);
  }, [days]);

  useEffect(() => {
    if (day) setOrder(mergeOrder(load<number[]>(flowKey(day.id)), day));
  }, [day]);

  // Persist the active workout on every change.
  useEffect(() => {
    if (active) store(ACTIVE_KEY, active);
  }, [active]);

  // Clock for elapsed time + rest countdown.
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [active]);

  const activeDay = useMemo(
    () => (active ? days.find((d) => d.id === active.dayId) ?? null : null),
    [active, days],
  );
  const byId = useMemo(
    () => new Map((activeDay ?? day)?.exercises.map((e) => [e.exerciseId, e]) ?? []),
    [activeDay, day],
  );
  const groups = useMemo(
    () => (active ? groupsFor(active.order, byId) : groupsFor(order, byId)),
    [active, order, byId],
  );
  const steps = useMemo(() => (active ? stepsFor(groups, active.rows) : []), [active, groups]);

  const doneCount = steps.filter((s) => active?.rows[s.exerciseId]?.[s.set]?.done).length;

  // --- Flow control ----------------------------------------------------------

  const patch = useCallback((fn: (a: Active) => Active) => {
    setActive((a) => (a ? fn(a) : a));
  }, []);

  function start() {
    if (!day) return;
    if (resumable && !confirm("You have a workout in progress. Start a new one and discard it?")) return;
    const rows: Record<number, Row[]> = {};
    for (const ex of day.exercises) {
      const last = lastSets[ex.exerciseId] ?? [];
      const n = ex.kind === "cardio" ? 1 : Math.max(1, ex.targetSets);
      rows[ex.exerciseId] = Array.from({ length: n }, (_, i) => {
        const src = last[i] ?? last[last.length - 1];
        return {
          reps: src?.reps != null ? String(src.reps) : "",
          weight: src?.weight != null ? String(src.weight) : "",
          durationMin: src?.durationSec != null ? String(Math.round(src.durationSec / 60)) : "",
          done: false,
        };
      });
    }
    setResult(null);
    setError(null);
    setResumable(null);
    setActive({
      v: 1,
      dayId: day.id,
      date,
      order,
      rows,
      step: 0,
      startedAt: Date.now(),
      restEndsAt: null,
      restTotal: restDefault,
      notes: "",
    });
    setPhase("set");
  }

  function resume() {
    if (!resumable) return;
    setActive(resumable);
    setResumable(null);
    setPhase(resumable.restEndsAt && resumable.restEndsAt > Date.now() ? "rest" : "set");
  }

  function discard() {
    if (!confirm("Discard this workout? Logged sets that aren't saved will be lost.")) return;
    store(ACTIVE_KEY, null);
    setActive(null);
    setResumable(null);
  }

  function nextUndone(from: number, a: Active, all: Step[]): number {
    for (let k = 1; k <= all.length; k++) {
      const i = (from + k) % all.length;
      if (!a.rows[all[i].exerciseId]?.[all[i].set]?.done) return i;
    }
    return -1;
  }

  function updateRow(field: keyof Row, v: string) {
    patch((a) => {
      const s = steps[a.step];
      if (!s) return a;
      const list = [...a.rows[s.exerciseId]];
      list[s.set] = { ...list[s.set], [field]: v };
      return { ...a, rows: { ...a.rows, [s.exerciseId]: list } };
    });
  }

  function completeSet() {
    if (!active) return;
    const s = steps[active.step];
    const ex = byId.get(s.exerciseId);
    const row = active.rows[s.exerciseId][s.set];
    const ok = ex?.kind === "cardio" ? Number(row.durationMin) > 0 : Number(row.reps) > 0;
    if (!ok) {
      setError(ex?.kind === "cardio" ? "Set the minutes first." : "Set your reps first.");
      return;
    }
    setError(null);
    navigator.vibrate?.(20);

    const rows = {
      ...active.rows,
      [s.exerciseId]: active.rows[s.exerciseId].map((r, i) => (i === s.set ? { ...r, done: true } : r)),
    };
    const next = nextUndone(active.step, { ...active, rows }, steps);
    // A blank upcoming set inherits the previous set of that exercise, so a
    // brand-new lift only needs its numbers picked once.
    if (next !== -1) {
      const n = steps[next];
      const target = rows[n.exerciseId][n.set];
      const prev = rows[n.exerciseId][n.set - 1];
      if (prev && !target.reps && !target.weight && !target.durationMin) {
        rows[n.exerciseId] = rows[n.exerciseId].map((r, i) =>
          i === n.set ? { ...prev, done: false } : r,
        );
      }
    }
    const a = { ...active, rows };
    if (next === -1) {
      setActive({ ...a, restEndsAt: null });
      setPhase("finish");
      return;
    }
    // No rest between superset partners.
    const group = groups.find((g) => g.includes(s.exerciseId));
    const partner = group && group.length > 1 && group.includes(steps[next].exerciseId) && steps[next].exerciseId !== s.exerciseId;
    if (partner) {
      setActive({ ...a, step: next, restEndsAt: null });
      setPhase("set");
    } else {
      setActive({ ...a, step: next, restEndsAt: Date.now() + a.restTotal * 1000 });
      setPhase("rest");
    }
  }

  function goTo(i: number) {
    patch((a) => ({ ...a, step: Math.max(0, Math.min(steps.length - 1, i)), restEndsAt: null }));
    setError(null);
    setPhase("set");
  }

  function addSet() {
    patch((a) => {
      const s = steps[a.step];
      const list = a.rows[s.exerciseId];
      const last = list[list.length - 1];
      return {
        ...a,
        rows: { ...a.rows, [s.exerciseId]: [...list, { ...last, done: false }] },
      };
    });
  }

  function adjustRest(delta: number) {
    patch((a) => {
      const total = Math.max(15, a.restTotal + delta);
      store(REST_KEY, total);
      setRestDefault(total);
      return { ...a, restTotal: total, restEndsAt: a.restEndsAt ? a.restEndsAt + delta * 1000 : null };
    });
  }

  // Rest finished → buzz and move on.
  useEffect(() => {
    if (phase === "rest" && active?.restEndsAt && now >= active.restEndsAt) {
      navigator.vibrate?.([80, 60, 80]);
      patch((a) => ({ ...a, restEndsAt: null }));
      setPhase("set");
    }
  }, [now, phase, active?.restEndsAt, patch]);

  function moveInOrder(id: number, dir: -1 | 1) {
    if (!day) return;
    setOrder((o) => {
      const i = o.indexOf(id);
      const j = i + dir;
      if (j < 0 || j >= o.length) return o;
      const next = [...o];
      [next[i], next[j]] = [next[j], next[i]];
      store(flowKey(day.id), next);
      return next;
    });
  }

  function resetOrder() {
    if (!day) return;
    store(flowKey(day.id), null);
    setOrder(mergeOrder(null, day));
  }

  async function save() {
    if (!active) return;
    setSaving(true);
    setError(null);
    const sets: { exerciseId: number; setNumber: number; reps?: number; weight?: number; durationSec?: number }[] = [];
    for (const id of active.order) {
      (active.rows[id] ?? []).forEach((r, i) => {
        if (!r.done) return;
        const reps = r.reps ? Number(r.reps) : undefined;
        const weight = r.weight ? Number(r.weight) : undefined;
        const durationSec = r.durationMin ? Math.round(Number(r.durationMin) * 60) : undefined;
        if (!reps && !durationSec) return;
        sets.push({ exerciseId: id, setNumber: i + 1, reps, weight: weight || undefined, durationSec });
      });
    }
    if (sets.length === 0) {
      setError("Complete at least one set first.");
      setSaving(false);
      return;
    }
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routineDayId: active.dayId, date: active.date, notes: active.notes || null, sets }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      store(ACTIVE_KEY, null);
      setResult({ totalXp: data.totalXp, xpByStat: data.xpByStat ?? {} });
      setPhase("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function closeSaved() {
    setActive(null);
    setResult(null);
    // Refresh after leaving the summary so the re-render can't reset it.
    router.push("/");
    router.refresh();
  }

  if (days.length === 0) {
    return <div className="card">No routine yet. Add one in prisma/program.ts.</div>;
  }

  // ===========================================================================
  // Active workout (full screen)
  // ===========================================================================

  if (active && activeDay) {
    const elapsed = now - active.startedAt;
    const cur = steps[active.step];
    const ex = cur ? byId.get(cur.exerciseId) : undefined;
    const row = cur ? active.rows[cur.exerciseId]?.[cur.set] : undefined;
    const group = cur ? groups.find((g) => g.includes(cur.exerciseId)) : undefined;
    const volume = steps.reduce((n, s) => {
      const r = active.rows[s.exerciseId][s.set];
      return r.done ? n + (Number(r.reps) || 0) * (Number(r.weight) || 0) : n;
    }, 0);

    const top = (
      <div className="fx-top">
        <button type="button" className="round sm" aria-label="Workout overview" onClick={() => setPhase(phase === "flow" ? "set" : "flow")}>
          {phase === "flow" ? <ChevronIcon dir="left" size={18} /> : <FlowIcon />}
        </button>
        <div className="fx-progress">
          <div className="fx-meta">
            <span>{activeDay.name}</span>
            <span className="clock">{fmtClock(elapsed)}</span>
          </div>
          <div className="fx-segs" aria-label={`${doneCount} of ${steps.length} sets done`}>
            {steps.map((s, i) => (
              <span
                key={i}
                className={
                  active.rows[s.exerciseId]?.[s.set]?.done ? "done" : i === active.step ? "cur" : ""
                }
              />
            ))}
          </div>
        </div>
        <button type="button" className="round sm" aria-label="Finish workout" onClick={() => setPhase("finish")}>
          <CheckIcon size={18} />
        </button>
      </div>
    );

    // --- Rest --------------------------------------------------------------
    if (phase === "rest" && active.restEndsAt && cur && ex && row) {
      const left = active.restEndsAt - now;
      return (
        <div className="fx">
          {top}
          <div className="fx-body center">
            <p className="card-label">Rest</p>
            <Ring value={left / (active.restTotal * 1000)} size={260} stroke={10} track="var(--surface-2)">
              <BigClock ms={left} />
            </Ring>
            <div className="fx-rest-adj">
              <button type="button" className="ghost" onClick={() => adjustRest(-15)}>−15s</button>
              <button type="button" className="ghost" onClick={() => adjustRest(15)}>+15s</button>
            </div>
            <div className="card fx-next">
              <span className="card-label">Up next</span>
              <div className="fx-next-name">{ex.name}</div>
              <div className="muted">
                Set {cur.set + 1} of {active.rows[cur.exerciseId].length} · {describeSet(row, ex.kind)}
              </div>
            </div>
          </div>
          <div className="fx-actions">
            <button type="button" className="sun btn-block" onClick={() => { patch((a) => ({ ...a, restEndsAt: null })); setPhase("set"); }}>
              Skip rest <ArrowRightIcon />
            </button>
          </div>
        </div>
      );
    }

    // --- Flow sheet ----------------------------------------------------------
    if (phase === "flow") {
      return (
        <div className="fx">
          {top}
          <div className="fx-body">
            <h2 className="fx-title">Workout flow</h2>
            <p className="muted" style={{ marginBottom: 14 }}>Tap any set to jump to it.</p>
            {groups.map((g, gi) => (
              <div key={gi} className={`card tight${g.length > 1 ? " fx-group" : ""}`}>
                {g.length > 1 && <span className="tag" style={{ marginLeft: 0 }}>Superset</span>}
                {g.map((id) => {
                  const e = byId.get(id)!;
                  return (
                    <div key={id} className="fx-flow-row">
                      <div className="name">{e.name}</div>
                      <div className="fx-dots">
                        {active.rows[id].map((r, si) => {
                          const idx = steps.findIndex((s) => s.exerciseId === id && s.set === si);
                          return (
                            <button
                              key={si}
                              type="button"
                              className={`fx-dot${r.done ? " done" : ""}${idx === active.step ? " cur" : ""}`}
                              onClick={() => goTo(idx)}
                              aria-label={`${e.name} set ${si + 1}${r.done ? ", done" : ""}`}
                            >
                              {si + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <button type="button" className="ghost btn-block" style={{ marginTop: 6 }} onClick={discard}>
              Discard workout
            </button>
          </div>
          <div className="fx-actions">
            <button type="button" className="btn-block" onClick={() => setPhase("finish")}>
              Finish workout
            </button>
          </div>
        </div>
      );
    }

    // --- Finish / saved --------------------------------------------------------
    if (phase === "finish" || phase === "saved") {
      if (phase === "saved" && result) {
        return (
          <div className="fx">
            <div className="fx-body center">
              <p className="card-label">Workout saved</p>
              <span className="dot" style={{ fontSize: 88, color: "var(--sun)" }}>+{result.totalXp}</span>
              <p className="muted" style={{ marginBottom: 18 }}>XP earned</p>
              <div className="tiles" style={{ width: "100%" }}>
                {Object.entries(result.xpByStat).map(([k, v]) => (
                  <div key={k} className="card tight">
                    <div className="stat-k" style={{ textTransform: "capitalize" }}>{k}</div>
                    <div className="dot stat-v" style={{ fontSize: 26 }}>+{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="fx-actions">
              <button type="button" className="sun btn-block" onClick={closeSaved}>Done</button>
            </div>
          </div>
        );
      }
      return (
        <div className="fx">
          {top}
          <div className="fx-body">
            <h2 className="fx-title">Nice work.</h2>
            <div className="tiles-3" style={{ marginTop: 14 }}>
              <div className="card"><div className="stat-k">Sets</div><div className="dot stat-v">{doneCount}</div></div>
              <div className="card"><div className="stat-k">Volume</div><div className="dot stat-v">{Math.round(volume)}</div></div>
              <div className="card"><div className="stat-k">Time</div><div className="dot stat-v">{Math.round(elapsed / 60000)}<small>m</small></div></div>
            </div>
            {active.order.map((id) => {
              const e = byId.get(id);
              if (!e) return null;
              return (
                <div key={id} className="card tight">
                  <div className="name" style={{ fontWeight: 700 }}>{e.name}</div>
                  <div className="fx-chips">
                    {active.rows[id].map((r, si) => (
                      <button
                        key={si}
                        type="button"
                        className={`chip${r.done ? "" : " faint"}`}
                        onClick={() => goTo(steps.findIndex((s) => s.exerciseId === id && s.set === si))}
                      >
                        {r.done ? describeSet(r, e.kind) : `Set ${si + 1} · not done`}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <label className="field" style={{ marginTop: 6 }}>
              <span>Notes</span>
              <textarea
                style={{ minHeight: 72, fontWeight: 500 }}
                placeholder="How did it feel?"
                value={active.notes}
                onChange={(e) => patch((a) => ({ ...a, notes: e.target.value }))}
              />
            </label>
            {error && <p className="fx-error">{error}</p>}
          </div>
          <div className="fx-actions">
            <button type="button" className="ghost" onClick={() => goTo(active.step)}>Back</button>
            <button type="button" className="sun" style={{ flex: 1 }} onClick={save} disabled={saving || doneCount === 0}>
              {saving ? "Saving…" : `Save ${doneCount} sets`}
            </button>
          </div>
        </div>
      );
    }

    // --- Current set -----------------------------------------------------------
    if (!cur || !ex || !row) return null;
    const total = active.rows[cur.exerciseId].length;
    const last = lastSets[cur.exerciseId];
    const lastThis = last?.[cur.set] ?? last?.[last.length - 1];
    const isCardio = ex.kind === "cardio";
    const isBw = ex.kind === "bodyweight";

    return (
      <div className="fx">
        {top}
        <div className="fx-body">
          <div className="fx-ex">
            {group && group.length > 1 && (
              <span className="chip lilac" style={{ marginBottom: 10 }}>
                Superset · {group.indexOf(cur.exerciseId) + 1}/{group.length}
              </span>
            )}
            <h2 className="fx-title">{ex.name}</h2>
            <div className="fx-setline">
              <span className="lbl">Set</span>
              <span className="dot">{cur.set + 1}</span>
              <span className="muted">of {total} · target {ex.targetReps}{isCardio ? " min" : " reps"}</span>
            </div>
            <div className="fx-last">
              {lastThis ? (
                <>Last time <strong>{describeSet(lastThis, ex.kind)}</strong></>
              ) : (
                "First time — pick a weight you can own"
              )}
            </div>
            {ex.cue && <p className="ex-cue">{ex.cue}</p>}
          </div>

          <div className={`fx-wheels${isCardio || isBw ? " one" : ""}`} key={`${cur.exerciseId}-${cur.set}`}>
            {isCardio ? (
              <Wheel label="Minutes" value={row.durationMin} step={1} max={120} onChange={(v) => updateRow("durationMin", v)} />
            ) : (
              <>
                <Wheel label="Reps" value={row.reps} step={1} max={50} onChange={(v) => updateRow("reps", v)} />
                {!isBw && (
                  <Wheel label="kg" value={row.weight} step={0.5} max={300} zeroLabel="BW" onChange={(v) => updateRow("weight", v)} />
                )}
              </>
            )}
          </div>

          <div className="fx-minor">
            <button type="button" onClick={() => goTo(active.step - 1)} disabled={active.step === 0}>
              ‹ Prev
            </button>
            <button type="button" onClick={addSet}>+ Add set</button>
            <button type="button" onClick={() => goTo(active.step + 1)} disabled={active.step >= steps.length - 1}>
              Skip ›
            </button>
          </div>
          {error && <p className="fx-error">{error}</p>}
        </div>
        <div className="fx-actions">
          <button type="button" className="sun btn-block fx-go" onClick={completeSet}>
            <CheckIcon /> {row.done ? "Update set" : "Complete set"}
          </button>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // Overview: pick the day, arrange the flow, start
  // ===========================================================================

  const current = days.filter((d) => d.dayOfWeek != null);
  const previous = days.filter((d) => d.dayOfWeek == null);
  const resumeDay = resumable ? days.find((d) => d.id === resumable.dayId) : null;
  const plannedSets = day?.exercises.reduce((n, e) => n + (e.optional ? 0 : e.targetSets), 0) ?? 0;

  return (
    <>
      {resumable && resumeDay && (
        <div className="card lilac fx-resume">
          <div>
            <span className="card-label">Workout in progress</span>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{resumeDay.name}</div>
            <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
              {Object.values(resumable.rows).flat().filter((r) => r.done).length} sets done · started{" "}
              {fmtClock(Date.now() - resumable.startedAt)} ago
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="round" style={{ background: "rgba(26,18,51,.15)", color: "var(--lilac-ink)", border: "none" }} onClick={discard} aria-label="Discard">
              ✕
            </button>
            <button type="button" className="round light" onClick={resume} aria-label="Resume workout" style={{ background: "var(--lilac-ink)", color: "#fff" }}>
              <ArrowRightIcon />
            </button>
          </div>
        </div>
      )}

      {current.length > 0 && (
        <div className="segmented" role="group" aria-label="Training day">
          {current.map((d) => (
            <button key={d.id} type="button" aria-pressed={d.id === dayId} onClick={() => setDayId(d.id)}>
              {d.name}
            </button>
          ))}
        </div>
      )}
      {previous.length > 0 && (
        <div className="chips-row" role="group" aria-label="Previous block">
          <span className="lbl">Previous block</span>
          {previous.map((d) => (
            <button key={d.id} type="button" aria-pressed={d.id === dayId} onClick={() => setDayId(d.id)}>
              {d.name}
            </button>
          ))}
        </div>
      )}

      <div className="date-row">
        <input type="date" aria-label="Workout date" value={date} onChange={(e) => setDate(e.target.value)} />
        {day?.focus && <span className="chip lilac">{day.focus}</span>}
      </div>

      {day && (
        <>
          <h2 className="section" style={{ marginTop: 8 }}>
            Your flow <small>{plannedSets} sets · reorder to taste</small>
          </h2>
          {groups.map((g, gi) => (
            <div key={gi} className={`card tight fx-plan${g.length > 1 ? " fx-group" : ""}`}>
              {g.length > 1 && <span className="tag" style={{ marginLeft: 0 }}>Superset — alternate sets</span>}
              {g.map((id) => {
                const e = byId.get(id);
                if (!e) return null;
                const pos = order.indexOf(id);
                const last = lastSets[id];
                const topSet = last?.length ? last.reduce((a, b) => ((b.weight ?? 0) > (a.weight ?? 0) ? b : a)) : null;
                return (
                  <div key={id} className="fx-plan-row">
                    <span className="fx-plan-n">{pos + 1}</span>
                    <span style={{ minWidth: 0 }}>
                      <span className="name" style={{ fontWeight: 700 }}>{e.name}</span>
                      <div className="sub muted" style={{ fontSize: 12.5 }}>
                        {e.targetSets} × {e.targetReps}
                        {topSet && <> · last {describeSet(topSet, e.kind)}</>}
                      </div>
                    </span>
                    <span className="fx-move">
                      <button type="button" aria-label={`Move ${e.name} up`} disabled={pos === 0} onClick={() => moveInOrder(id, -1)}>
                        <ChevronIcon dir="up" size={16} />
                      </button>
                      <button type="button" aria-label={`Move ${e.name} down`} disabled={pos === order.length - 1} onClick={() => moveInOrder(id, 1)}>
                        <ChevronIcon dir="down" size={16} />
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
          <button type="button" className="ghost btn-block" onClick={resetOrder} style={{ marginBottom: 96 }}>
            Reset to program order
          </button>

          <div className="savebar">
            <span className="count" style={{ paddingLeft: 12 }}>
              <strong>{day.name}</strong>
              {day.exercises.length} lifts · {plannedSets} sets
            </span>
            <button type="button" className="sun" onClick={start}>
              Start workout <ArrowRightIcon />
            </button>
          </div>
        </>
      )}
    </>
  );
}

/** Doto digits with an Urbanist colon (Doto's colon reads as a glyph). */
function BigClock({ ms }: { ms: number }) {
  const [m, s] = fmtClock(ms).split(":");
  return (
    <span className="dot" style={{ fontSize: 68 }}>
      {m}
      <span className="colon">:</span>
      {s}
    </span>
  );
}

function FlowIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}
