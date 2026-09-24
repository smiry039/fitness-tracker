import { getViking } from "@/lib/data";
import { Ring, TickGauge } from "../ui";

export const dynamic = "force-dynamic";

export default async function VikingPage() {
  const viking = await getViking();
  const { overall } = viking;
  // Highlight the leading stat with the lilac card.
  const topKey = viking.stats.reduce((a, b) => (b.xp > a.xp ? b : a)).key;

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">Character</p>
          <h1>{viking.name}</h1>
        </div>
      </header>

      <section className="card hero" aria-label="Overall level">
        <div className="hero-top">
          <strong>Level</strong>
          <span>{viking.totalXp.toLocaleString("en-US")} XP</span>
        </div>
        <div style={{ margin: "6px 0 4px" }}>
          <TickGauge value={overall.progress} size={250}>
            <span className="dot gauge-value" style={{ fontSize: 84 }}>
              {overall.level}
            </span>
            <span className="gauge-sub">{Math.round(overall.progress * 100)}% to Lv {overall.level + 1}</span>
          </TickGauge>
        </div>
        <div className="hero-bottom">
          <span className="status">Every set feeds a stat</span>
          <span>
            {overall.xpForNextLevel - overall.xpIntoLevel} XP to go
          </span>
        </div>
      </section>

      <h2 className="section">Stats</h2>
      <div className="tiles">
        {viking.stats.map((s) => {
          const lead = s.key === topKey;
          const idle = s.xp === 0;
          return (
            <div className={`card stat-tile${lead ? " lilac" : ""}`} key={s.key}>
              <div className="top">
                <span className="name">{s.label}</span>
                <Ring
                  value={s.progress}
                  size={48}
                  stroke={4.5}
                  color={lead ? "var(--sun)" : "var(--lilac)"}
                  track={lead ? "rgba(26, 18, 51, 0.2)" : "var(--surface-3)"}
                >
                  <span style={{ fontSize: 11 }}>{Math.round(s.progress * 100)}%</span>
                </Ring>
              </div>
              <span className="dot" style={{ fontSize: 38 }}>
                <span className="lv">Lv</span>
                {s.level}
              </span>
              <span className={`blurb ${lead ? "muted" : "faint"}`}>
                {idle ? "Dormant — log cardio to wake it." : describeGroups(s.key)}
              </span>
              <span className={`xp ${lead ? "" : "muted"}`}>
                {s.xpIntoLevel} / {s.xpForNextLevel} XP
              </span>
            </div>
          );
        })}
      </div>

      <h2 className="section">How it grows</h2>
      <div className="card tight">
        {viking.stats.map((s) => (
          <div className="list-row" key={s.key} style={{ gridTemplateColumns: "1fr auto" }}>
            <span>
              <span className="name">{s.label}</span>
              <div className="sub">{s.blurb}</div>
            </span>
            <span className="chip">{describeGroups(s.key)}</span>
          </div>
        ))}
        <p className="faint" style={{ fontSize: 12.5, marginTop: 10 }}>
          Weighted lifts earn XP from volume (reps × kg), bodyweight per rep, cardio per
          minute.
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
