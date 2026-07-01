import Link from "next/link";
import { getRoutine, getSuggestedDay, getRecentSessions, getViking } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const [routine, suggested, recent, viking] = await Promise.all([
    getRoutine(),
    getSuggestedDay(),
    getRecentSessions(1),
    getViking(),
  ]);

  const lastSession = recent[0];

  return (
    <>
      <h1>Today</h1>
      <p className="muted">
        {viking.name} — overall level {viking.overallLevel} · {viking.totalXp} XP total
      </p>

      {suggested ? (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>
            Next up: {suggested.name} <span className="badge">suggested</span>
          </h2>
          <table>
            <thead>
              <tr>
                <th>Exercise</th>
                <th>Target</th>
                <th>Group</th>
              </tr>
            </thead>
            <tbody>
              {suggested.exercises.map((re) => (
                <tr key={re.id}>
                  <td>{re.exercise.name}</td>
                  <td>
                    {re.targetSets} × {re.targetReps}
                  </td>
                  <td className="muted">{re.exercise.muscleGroup}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginBottom: 0 }}>
            <Link href={`/log?day=${suggested.id}`}>→ Log this workout</Link>
          </p>
        </div>
      ) : (
        <div className="panel">
          No routine yet. Edit <code>prisma/seed.ts</code> and run{" "}
          <code>npm run db:reset</code>.
        </div>
      )}

      {lastSession && (
        <>
          <h2>Last workout</h2>
          <div className="panel">
            <strong>{lastSession.routineDay?.name ?? "Freeform"}</strong>{" "}
            <span className="muted">
              — {new Date(lastSession.date).toLocaleDateString()}
            </span>
            <table>
              <tbody>
                {lastSession.sets.map((s) => (
                  <tr key={s.id}>
                    <td>{s.exercise.name}</td>
                    <td className="muted">
                      {s.durationSec
                        ? `${Math.round(s.durationSec / 60)} min`
                        : `${s.reps ?? "-"} reps` +
                          (s.weight ? ` @ ${s.weight} kg` : "")}
                    </td>
                    <td className="muted">+{s.xpAwarded} XP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2>Full routine</h2>
      {routine.map((day) => (
        <div className="panel" key={day.id}>
          <strong>{day.name}</strong>
          <table>
            <tbody>
              {day.exercises.map((re) => (
                <tr key={re.id}>
                  <td>{re.exercise.name}</td>
                  <td className="muted">
                    {re.targetSets} × {re.targetReps}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginBottom: 0 }}>
            <Link href={`/log?day=${day.id}`}>→ Log {day.name}</Link>
          </p>
        </div>
      ))}
    </>
  );
}
