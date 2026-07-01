import { getViking } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function VikingPage() {
  const viking = await getViking();

  return (
    <>
      <h1>{viking.name}</h1>
      <p className="muted">
        Overall level {viking.overallLevel} · {viking.totalXp} XP earned across all
        disciplines. Every set you log feeds one of these stats.
      </p>

      {viking.stats.map((s) => (
        <div className="panel" key={s.key}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            <strong>{s.label}</strong>
            <span className="badge">Level {s.level}</span>
          </div>
          <p className="muted" style={{ margin: "4px 0 10px" }}>
            {s.blurb}
          </p>
          <div className="bar">
            <span style={{ width: `${Math.round(s.progress * 100)}%` }} />
          </div>
          <p className="muted" style={{ margin: "6px 0 0", fontSize: 13 }}>
            {s.xpIntoLevel} / {s.xpForNextLevel} XP to level {s.level + 1} ·{" "}
            {s.xp} total
          </p>
        </div>
      ))}

      <h2>How it grows</h2>
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Stat</th>
              <th>Fed by</th>
            </tr>
          </thead>
          <tbody>
            {viking.stats.map((s) => (
              <tr key={s.key}>
                <td>{s.label}</td>
                <td className="muted">{describeGroups(s.key)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ marginBottom: 0, fontSize: 13 }}>
          Weighted lifts earn XP from volume (reps × kg), bodyweight moves per rep,
          and cardio per minute. Hunts, resources, and clans come later — this is
          the foundation they’ll build on.
        </p>
      </div>
    </>
  );
}

function describeGroups(key: string): string {
  switch (key) {
    case "vigour":
      return "chest, delts (pressing)";
    case "will":
      return "back, rear delts, neck (pulling)";
    case "might":
      return "legs, calves";
    case "sinew":
      return "biceps, triceps, arms";
    case "heart":
      return "cardio / conditioning";
    default:
      return "";
  }
}
