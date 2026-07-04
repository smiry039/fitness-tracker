import { getViking } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function VikingPage() {
  const viking = await getViking();

  return (
    <>
      <p className="eyebrow">Character</p>
      <div className="level-hero" style={{ marginTop: 8 }}>
        <div className="level-ring">
          <span className="lv">{viking.overallLevel}</span>
          <span className="cap">Level</span>
        </div>
        <div>
          <h1 className="screen-title" style={{ margin: 0 }}>
            {viking.name}
          </h1>
          <p className="muted" style={{ fontSize: 13 }}>
            {viking.totalXp.toLocaleString()} XP earned · every set feeds a
            stat
          </p>
        </div>
      </div>

      <h2 className="section">Stats</h2>
      {viking.stats.map((s) => (
        <div className="card" key={s.key}>
          <div className="card-head">
            <span className="card-title">{s.label}</span>
            <span className="badge">Lv {s.level}</span>
          </div>
          <p className="muted" style={{ fontSize: 12.5, margin: "3px 0 10px" }}>
            {s.blurb}
          </p>
          <div className="bar">
            <span style={{ width: `${Math.max(2, Math.round(s.progress * 100))}%` }} />
          </div>
          <p
            className="muted"
            style={{ margin: "7px 0 0", fontSize: 12, fontFamily: "var(--font-mono)" }}
          >
            {s.xpIntoLevel} / {s.xpForNextLevel} XP → Lv {s.level + 1}
          </p>
        </div>
      ))}

      <h2 className="section">How it grows</h2>
      <div className="card">
        {viking.stats.map((s, i) => (
          <div className="row" key={s.key}>
            <span className="num">{String(i + 1).padStart(2, "0")}</span>
            <span className="name">{s.label}</span>
            <span className="reps">{describeGroups(s.key)}</span>
          </div>
        ))}
        <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
          Weighted lifts earn XP from volume (reps × kg), bodyweight per rep,
          cardio per minute. Hunts, resources, and the shieldwall come later —
          this is the foundation they build on.
        </p>
      </div>
    </>
  );
}

function describeGroups(key: string): string {
  switch (key) {
    case "vigour":
      return "chest · delts";
    case "will":
      return "back · rear delt · neck";
    case "might":
      return "legs · calves";
    case "sinew":
      return "biceps · triceps";
    case "heart":
      return "cardio";
    default:
      return "";
  }
}
