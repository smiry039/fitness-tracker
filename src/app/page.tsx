import Link from "next/link";
import {
  getLastSetsForExercises,
  getRecentSessions,
  getRoutine,
  getSuggestedDay,
  getViking,
  getWeekSummary,
} from "@/lib/data";
import { ArrowRightIcon, ChevronIcon, Ring, ShieldIcon, TickGauge, fmtKg } from "./ui";

export const dynamic = "force-dynamic";

const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function TodayPage() {
  const [routine, recent, viking] = await Promise.all([
    getRoutine(),
    getRecentSessions(1),
    getViking(),
  ]);
  const [suggested, week] = await Promise.all([
    getSuggestedDay(routine),
    getWeekSummary(routine),
  ]);
  const lastSets = suggested
    ? await getLastSetsForExercises(suggested.exercises.map((re) => re.exerciseId))
    : {};

  const now = new Date();
  const isToday = suggested?.dayOfWeek === now.getDay();
  const load = week.setsPlanned > 0 ? week.setsDone / week.setsPlanned : 0;
  const lastLoad = week.setsPlanned > 0 ? week.lastWeekSetsDone / week.setsPlanned : 0;
  const behind = Math.max(0, week.sessionsExpected - week.sessions);
  const status =
    week.sessions >= week.sessionsPlanned && week.sessionsPlanned > 0
      ? { text: "Week complete", warn: false }
      : behind > 0
        ? { text: `${behind} session${behind === 1 ? "" : "s"} behind`, warn: true }
        : { text: "On track", warn: false };

  const current = routine.filter((d) => d.dayOfWeek !== null);
  const previous = routine.filter((d) => d.dayOfWeek === null);

  const lastSession = recent[0];
  const lastVolume = lastSession
    ? lastSession.sets.reduce((n, s) => n + (s.reps ?? 0) * (s.weight ?? 0), 0)
    : 0;

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">
            {DOW[now.getDay()]}, {now.getDate()} {MON[now.getMonth()]}
          </p>
          <h1>Let&apos;s train.</h1>
        </div>
        <Link href="/viking" className="round" aria-label={`${viking.name}, level ${viking.overallLevel}`}>
          <ShieldIcon />
        </Link>
      </header>

      {/* Weekly load: sets logged this week vs. the plan's weekly target. */}
      <section className="card hero" aria-label="Weekly load">
        <div className="hero-top">
          <strong>Weekly load</strong>
          <span>
            {week.sessions}/{week.sessionsPlanned} sessions
          </span>
        </div>
        <div className="hero-mid">
          <div className="hero-side">
            <span className="dot">{Math.round(lastLoad * 100)}%</span>
            last week
          </div>
          <TickGauge value={load} size={228}>
            <span className="dot gauge-value">{Math.round(load * 100)}%</span>
            <span className="gauge-sub">
              {week.setsDone} of {week.setsPlanned} sets
            </span>
          </TickGauge>
          <div className="hero-side">
            <span className="dot">{week.streakWeeks}</span>
            week streak
          </div>
        </div>
        <div className="hero-bottom">
          <span className={`status${status.warn ? " warn" : ""}`}>{status.text}</span>
          <span>Mon – Sun</span>
        </div>
      </section>

      <div className="tiles">
        <Link href="/viking" className="card lilac" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="card-label">{viking.name}</span>
            <Ring value={viking.overall.progress} size={56} stroke={5}>
              <span style={{ fontSize: 12 }}>{Math.round(viking.overall.progress * 100)}%</span>
            </Ring>
          </div>
          <span className="dot stat-v" style={{ marginTop: "auto", fontSize: 36 }}>
            <span className="lv">Lv</span>
            {viking.overallLevel}
          </span>
          <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
            {viking.overall.xpForNextLevel - viking.overall.xpIntoLevel} XP to Lv{" "}
            {viking.overallLevel + 1}
          </span>
        </Link>

        <Link href="/calendar" className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="card-label">Last workout</span>
          {lastSession ? (
            <>
              <span className="dot stat-v" style={{ marginTop: "auto" }}>
                {fmtKg(lastVolume)}
                <small>kg</small>
              </span>
              <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
                {lastSession.routineDay?.name ?? "Freeform"} · {lastSession.sets.length} sets ·{" "}
                {new Date(lastSession.date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  timeZone: "UTC",
                })}
              </span>
            </>
          ) : (
            <span className="muted" style={{ marginTop: "auto", fontSize: 13 }}>
              Nothing logged yet.
            </span>
          )}
        </Link>
      </div>

      {suggested ? (
        <section className="card" aria-label="Next workout">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <span className="card-label">{isToday ? "Today" : "Next up"}</span>
              <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                {suggested.name}
              </h2>
              {suggested.focus && <span className="muted" style={{ fontSize: 14 }}>{suggested.focus}</span>}
            </div>
            <span className="chip lilac">{suggested.exercises.length} lifts</span>
          </div>

          <div style={{ marginTop: 14 }}>
            {suggested.exercises.map((re, i) => {
              const last = lastSets[re.exerciseId];
              const top = last?.length
                ? last.reduce((a, b) => ((b.weight ?? 0) > (a.weight ?? 0) ? b : a))
                : null;
              const superset = re.cue?.toLowerCase().startsWith("superset");
              return (
                <div className="list-row" key={re.id}>
                  <span className="idx">{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="name">
                      {re.exercise.name}
                      {superset && <span className="tag">SS</span>}
                    </span>
                    <div className="sub">
                      {top ? (
                        <>
                          Last <span className="hl">{top.weight ? `${top.weight} kg × ${top.reps}` : `${top.reps} reps`}</span>
                        </>
                      ) : (
                        "First time — find your working weight"
                      )}
                    </div>
                  </span>
                  <span className="chip">
                    {re.targetSets} × {re.targetReps}
                  </span>
                </div>
              );
            })}
          </div>

          <Link href={`/log?day=${suggested.id}`} className="btn btn-block split" style={{ marginTop: 14 }}>
            Start {suggested.name}
            <span className="round">
              <ArrowRightIcon />
            </span>
          </Link>
        </section>
      ) : (
        <div className="card">
          No routine yet. Add one in <code>prisma/program.ts</code> and run{" "}
          <code>npm run db:sync-routine</code>.
        </div>
      )}

      <h2 className="section">
        Your split <small>{current.length} days</small>
      </h2>
      {current.map((day) => (
        <DayFold key={day.id} day={day} />
      ))}

      {previous.length > 0 && (
        <>
          <h2 className="section">
            Previous block <small>still loggable</small>
          </h2>
          {previous.map((day) => (
            <DayFold key={day.id} day={day} />
          ))}
        </>
      )}
    </>
  );
}

type Day = Awaited<ReturnType<typeof getRoutine>>[number];

function DayFold({ day }: { day: Day }) {
  const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <details className="fold">
      <summary>
        <span>
          <span className="t">{day.name}</span>{" "}
          <span className="s">
            {day.dayOfWeek !== null ? `${DOW_SHORT[day.dayOfWeek]} · ` : ""}
            {day.focus}
          </span>
        </span>
        <span className="round">
          <ChevronIcon size={18} />
        </span>
      </summary>
      <div className="fold-body">
        {day.exercises.map((re, i) => (
          <div className="list-row" key={re.id}>
            <span className="idx">{re.optional ? "+" : String(i + 1).padStart(2, "0")}</span>
            <span className="name" style={{ fontSize: 14 }}>
              {re.exercise.name}
            </span>
            <span className="chip">
              {re.targetSets} × {re.targetReps}
            </span>
          </div>
        ))}
        <Link href={`/log?day=${day.id}`} className="btn ghost btn-block" style={{ marginTop: 12 }}>
          Log {day.name}
        </Link>
      </div>
    </details>
  );
}
