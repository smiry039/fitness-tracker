import Link from "next/link";
import { getSessionsForMonth } from "@/lib/data";

export const dynamic = "force-dynamic";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

  const trainedDays = byDay.size;

  return (
    <>
      <h1>Calendar</h1>
      <p className="muted">
        {trainedDays} training day{trainedDays === 1 ? "" : "s"} in{" "}
        {MONTHS[month - 1]} {year}.
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Link href={`/calendar?y=${prevY}&m=${prevM}`}>← {MONTHS[prevM - 1]}</Link>
        <strong>
          {MONTHS[month - 1]} {year}
        </strong>
        <Link href={`/calendar?y=${nextY}&m=${nextM}`}>{MONTHS[nextM - 1]} →</Link>
      </div>

      <div className="grid-cal" style={{ marginBottom: 4 }}>
        {DOW.map((d) => (
          <div className="dow" key={d}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid-cal">
        {cells.map((d, i) => {
          if (d === null) return <div className="cell empty" key={`e${i}`} />;
          const workouts = byDay.get(d);
          return (
            <div className={`cell${workouts ? " trained" : ""}`} key={d}>
              <div className="muted">{d}</div>
              {workouts?.map((w, j) => (
                <div key={j}>
                  <span style={{ color: "var(--accent)" }}>⚔</span> {w.name}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
