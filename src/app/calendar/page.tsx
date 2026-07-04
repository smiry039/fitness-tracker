import Link from "next/link";
import { getSessionsForMonth } from "@/lib/data";

export const dynamic = "force-dynamic";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["M", "T", "W", "T", "F", "S", "S"];

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
  for (const s of sessions) {
    const day = new Date(s.date).getDate();
    const list = byDay.get(day) ?? [];
    list.push({ name: s.routineDay?.name ?? "Freeform", sets: s.sets.length });
    byDay.set(day, list);
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
      <p className="eyebrow">Calendar</p>
      <h1 className="screen-title">
        {trainedDays} day{trainedDays === 1 ? "" : "s"}{" "}
        <span className="accent">trained.</span>
      </h1>
      <p className="screen-sub">
        {MONTHS[month - 1]} {year}
      </p>

      <div className="cal-nav">
        <Link href={`/calendar?y=${prevY}&m=${prevM}`} aria-label="Previous month">
          ‹
        </Link>
        <strong>
          {MONTHS[month - 1]} {year}
        </strong>
        <Link href={`/calendar?y=${nextY}&m=${nextM}`} aria-label="Next month">
          ›
        </Link>
      </div>

      <div className="grid-cal" style={{ marginBottom: 4 }}>
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
            >
              <span>{d}</span>
              {workouts && <span className="dot" />}
            </div>
          );
        })}
      </div>

      {sessions.length > 0 && (
        <>
          <h2 className="section">This month</h2>
          <div className="card">
            {sessions
              .slice()
              .reverse()
              .map((s) => (
                <div className="row" key={s.id}>
                  <span className="num">
                    {String(new Date(s.date).getDate()).padStart(2, "0")}
                  </span>
                  <span className="name">
                    {s.routineDay?.name ?? "Freeform"}
                  </span>
                  <span className="reps">{s.sets.length} sets</span>
                </div>
              ))}
          </div>
        </>
      )}
    </>
  );
}
