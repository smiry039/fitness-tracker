import Link from "next/link";
import { getSessionsForMonth } from "@/lib/data";
import { ChevronIcon, fmtKg } from "../ui";

export const dynamic = "force-dynamic";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["M", "T", "W", "T", "F", "S", "S"];
const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { y?: string; m?: string };
}) {
  const now = new Date();
  const year = searchParams.y ? Number(searchParams.y) : now.getFullYear();
  const month = searchParams.m ? Number(searchParams.m) : now.getMonth() + 1; // 1-12

  const sessions = await getSessionsForMonth(year, month);

  // Group sessions by day-of-month.
  const byDay = new Map<number, { name: string; sets: number }[]>();
  let totalSets = 0;
  let totalVolume = 0;
  for (const s of sessions) {
    const day = new Date(s.date).getDate();
    const list = byDay.get(day) ?? [];
    list.push({ name: s.routineDay?.name ?? "Freeform", sets: s.sets.length });
    byDay.set(day, list);
    totalSets += s.sets.length;
    for (const set of s.sets) totalVolume += (set.reps ?? 0) * (set.weight ?? 0);
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  // Monday-first offset for the 1st of the month.
  const firstDow = (new Date(year, month - 1, 1).getDay() + 6) % 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevM = month === 1 ? 12 : month - 1;
  const prevY = month === 1 ? year - 1 : year;
  const nextM = month === 12 ? 1 : month + 1;
  const nextY = month === 12 ? year + 1 : year;

  const isThisMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;
  const trainedDays = byDay.size;

  return (
    <>
      <header className="page-head center">
        <Link href={`/calendar?y=${prevY}&m=${prevM}`} className="round" aria-label="Previous month">
          <ChevronIcon dir="left" />
        </Link>
        <div style={{ textAlign: "center" }}>
          <p className="eyebrow">{year}</p>
          <h1>{MONTHS[month - 1]}</h1>
        </div>
        <Link href={`/calendar?y=${nextY}&m=${nextM}`} className="round" aria-label="Next month">
          <ChevronIcon />
        </Link>
      </header>

      <div className="tiles-3">
        <div className="card">
          <div className="stat-k">Days</div>
          <div className="dot stat-v">{trainedDays}</div>
        </div>
        <div className="card">
          <div className="stat-k">Sets</div>
          <div className="dot stat-v">{totalSets}</div>
        </div>
        <div className="card">
          <div className="stat-k">Volume</div>
          <div className="dot stat-v">
            {fmtKg(totalVolume)}
            {totalVolume < 10000 && <small>kg</small>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="grid-cal" style={{ marginBottom: 2 }}>
          {DOW.map((d, i) => (
            <div className="dow" key={i}>
              {d}
            </div>
          ))}
        </div>
        <div className="grid-cal">
          {cells.map((d, i) => {
            if (d === null) return <div className="cell empty" key={`e${i}`} />;
            const workouts = byDay.get(d);
            const isToday = isThisMonth && d === now.getDate();
            return (
              <div
                className={`cell${workouts ? " trained" : ""}${isToday ? " today" : ""}`}
                key={d}
                title={workouts?.map((w) => w.name).join(", ")}
              >
                {d}
              </div>
            );
          })}
        </div>
      </div>

      {sessions.length > 0 ? (
        <>
          <h2 className="section">
            Sessions <small>{sessions.length} this month</small>
          </h2>
          <div className="card tight">
            {sessions
              .slice()
              .reverse()
              .map((s) => {
                const d = new Date(s.date);
                const volume = s.sets.reduce((n, x) => n + (x.reps ?? 0) * (x.weight ?? 0), 0);
                return (
                  <div className="list-row" key={s.id} style={{ gridTemplateColumns: "44px 1fr auto" }}>
                    <span style={{ textAlign: "center", lineHeight: 1.1 }}>
                      <span className="dot" style={{ fontSize: 20, display: "block" }}>
                        {String(d.getDate()).padStart(2, "0")}
                      </span>
                      <span className="faint" style={{ fontSize: 11, fontWeight: 600 }}>
                        {WEEKDAY[d.getDay()]}
                      </span>
                    </span>
                    <span>
                      <span className="name">{s.routineDay?.name ?? "Freeform"}</span>
                      <div className="sub">{s.routineDay?.focus ?? `${s.sets.length} sets`}</div>
                    </span>
                    <span style={{ textAlign: "right" }}>
                      <span className="chip">{s.sets.length} sets</span>
                      <div className="faint" style={{ fontSize: 11.5, fontWeight: 600, marginTop: 4 }}>
                        {fmtKg(volume)} kg
                      </div>
                    </span>
                  </div>
                );
              })}
          </div>
        </>
      ) : (
        <p className="muted" style={{ textAlign: "center", marginTop: 24 }}>
          No sessions this month{isThisMonth ? " yet" : ""}.
        </p>
      )}
    </>
  );
}
