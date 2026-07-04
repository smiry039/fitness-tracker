import Link from "next/link";
import {
  getRoutine,
  getSuggestedDay,
  getRecentSessions,
  getViking,
} from "@/lib/data";

export const dynamic = "force-dynamic";

const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function TodayPage() {
  const [routine, recent, viking] = await Promise.all([
    getRoutine(),
    getRecentSessions(1),
    getViking(),
  ]);
  const suggested = await getSuggestedDay(routine);

  const now = new Date();
  const lastSession = recent[0];
  const restDay = suggested ? suggested.dayOfWeek !== now.getDay() : true;

  return (
    <>
      <p className="eyebrow">
        {DOW[now.getDay()]} · {MON[now.getMonth()]} {now.getDate()}
      </p>
      <h1 className="screen-title">
        {suggested ? (
          <>
            {restDay ? "Next up" : "Today"}:{" "}
            <span className="accent">{suggested.name}</span>
          </>
        ) : (
          "Today"
        )}
      </h1>
      <p className="screen-sub">
        {suggested?.focus ? `${suggested.focus} · ` : ""}
        {viking.name} — Lv {viking.overallLevel} · {viking.totalXp} XP
      </p>

      {suggested ? (
        <div className="card">
          {suggested.exercises.map((re, i) => (
            <div className="row" key={re.id}>
              <span className={`num${re.optional ? " opt" : ""}`}>
                {re.optional ? "+" : String(i + 1).padStart(2, "0")}
              </span>
              <span>
                <span className="name">
                  {re.optional && <span className="badge">Extra</span>}{" "}
                  {re.exercise.name}
                </span>
                {re.cue && <div className="cue">{re.cue}</div>}
              </span>
              <span className="reps">
                {re.targetSets} × {re.targetReps}
              </span>
            </div>
          ))}
          <Link
            href={`/log?day=${suggested.id}`}
            className="btn btn-block"
            style={{ marginTop: 14 }}
          >
            Start {suggested.name}
          </Link>
        </div>
      ) : (
        <div className="card">
          No routine yet. Edit <code>prisma/seed.ts</code> and run{" "}
          <code>npm run db:reset</code>.
        </div>
      )}

      {lastSession && (
        <>
          <h2 className="section">Last workout</h2>
          <div className="card">
            <div className="card-head">
              <span className="card-title">
                {lastSession.routineDay?.name ?? "Freeform"}
              </span>
              <span className="badge neutral">
                {new Date(lastSession.date).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
            {lastSession.sets.map((s, i) => (
              <div className="row" key={s.id}>
                <span className="num">{String(i + 1).padStart(2, "0")}</span>
                <span className="name">{s.exercise.name}</span>
                <span className="reps">
                  {s.durationSec
                    ? `${Math.round(s.durationSec / 60)} min`
                    : `${s.reps ?? "–"}${s.weight ? ` × ${s.weight}kg` : ""}`}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="section">Full program</h2>
      {routine.map((day) => (
        <details className="day-fold" key={day.id}>
          <summary>
            <span>
              {day.name}
              {day.focus && (
                <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>
                  {" "}
                  — {day.focus}
                </span>
              )}
            </span>
            <span className="chev">▶</span>
          </summary>
          <div className="fold-body">
            {day.exercises.map((re, i) => (
              <div className="row" key={re.id}>
                <span className={`num${re.optional ? " opt" : ""}`}>
                  {re.optional ? "+" : String(i + 1).padStart(2, "0")}
                </span>
                <span className="name">{re.exercise.name}</span>
                <span className="reps">
                  {re.targetSets} × {re.targetReps}
                </span>
              </div>
            ))}
            <Link
              href={`/log?day=${day.id}`}
              className="btn btn-quiet btn-block"
              style={{ marginTop: 14 }}
            >
              Log {day.name}
            </Link>
          </div>
        </details>
      ))}
    </>
  );
}
