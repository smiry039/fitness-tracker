"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface ExOption {
  id: number;
  name: string;
  inPlan: boolean;
  hasData: boolean;
}

interface Point {
  date: string;
  topWeight: number;
  estimated1RM: number;
  totalVolume: number;
}

type Metric = "estimated1RM" | "topWeight" | "totalVolume";

const METRICS: { key: Metric; label: string; unit: string }[] = [
  { key: "estimated1RM", label: "Est. 1RM", unit: "kg" },
  { key: "topWeight", label: "Top set", unit: "kg" },
  { key: "totalVolume", label: "Volume", unit: "kg" },
];

// Palette tokens (see globals.css): lilac series, yellow "you are here".
const LINE = "#b9a4ff";
const SUN = "#ffd64a";
const GRID = "#2a2a2f";
const INK_MUTED = "#6b6b73";
const INK = "#f4f4f5";
const SURFACE = "#141416";

// --- Tiny dependency-free line chart with a touch scrubber -----------------
// A single series on a dark surface: 2px line, recessive horizontal grid,
// drag/touch anywhere to read exact values. Replaces a ~100 kB chart lib.

const W = 360;
const H = 220;
const PAD = { top: 30, right: 10, bottom: 22, left: 34 };

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    min -= pad;
    max += pad;
  }
  const span = max - min;
  const step0 = span / (count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) ?? step0;
  const lo = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= max + step * 0.51; v += step) ticks.push(v);
  return ticks;
}

function fmt(n: number): string {
  if (Math.abs(n) >= 10000) return `${Math.round(n / 100) / 10}k`;
  return `${Math.round(n * 10) / 10}`;
}

function LineChart({
  points,
  unit,
}: {
  points: { date: string; value: number }[];
  unit: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const { xs, ys, ticks } = useMemo(() => {
    const values = points.map((p) => p.value);
    let min = Math.min(...values);
    let max = Math.max(...values);
    const pad = (max - min) * 0.12 || Math.abs(max) * 0.08 || 1;
    min -= pad;
    max += pad;
    const ticks = niceTicks(min, max);
    min = Math.min(min, ticks[0]);
    max = Math.max(max, ticks[ticks.length - 1]);

    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;
    const xs = points.map((_, i) =>
      points.length === 1
        ? PAD.left + plotW / 2
        : PAD.left + (i / (points.length - 1)) * plotW,
    );
    const ys = values.map(
      (v) => PAD.top + (1 - (v - min) / (max - min)) * plotH,
    );
    return { xs, ys, ticks: ticks.filter((t) => t >= min && t <= max) };
  }, [points]);

  const yFor = (v: number) => {
    const values = points.map((p) => p.value);
    let min = Math.min(...values);
    let max = Math.max(...values);
    const pad = (max - min) * 0.12 || Math.abs(max) * 0.08 || 1;
    min -= pad;
    max += pad;
    const t0 = ticks[0] ?? min;
    const t1 = ticks[ticks.length - 1] ?? max;
    min = Math.min(min, t0);
    max = Math.max(max, t1);
    return PAD.top + (1 - (v - min) / (max - min)) * (H - PAD.top - PAD.bottom);
  };

  const linePath = xs.map((x, i) => `${i ? "L" : "M"}${x},${ys[i]}`).join(" ");
  const areaPath =
    `${linePath} L${xs[xs.length - 1]},${H - PAD.bottom} L${xs[0]},${H - PAD.bottom} Z`;

  function scrub(clientX: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestD = Infinity;
    xs.forEach((px, i) => {
      const d = Math.abs(px - x);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setActive(best);
  }

  const a = active;
  const tipX = a != null ? Math.min(Math.max(xs[a], 52), W - 52) : 0;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: "auto", display: "block", touchAction: "pan-y" }}
      onPointerDown={(e) => scrub(e.clientX)}
      onPointerMove={(e) => e.buttons !== 0 && scrub(e.clientX)}
      onPointerUp={() => setActive(null)}
      onPointerLeave={() => setActive(null)}
      role="img"
      aria-label="Progress line chart — press and drag to read values"
    >
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={yFor(t)}
            y2={yFor(t)}
            stroke={GRID}
            strokeWidth={1.2}
            strokeDasharray="1 4"
            strokeLinecap="round"
          />
          <text
            x={PAD.left - 8}
            y={yFor(t) + 3}
            textAnchor="end"
            fontSize={10}
            fontWeight={600}
            fontFamily="var(--font-body)"
            fill={INK_MUTED}
          >
            {fmt(t)}
          </text>
        </g>
      ))}

      <text
        x={PAD.left}
        y={H - 6}
        fontSize={10}
        fontWeight={600}
        fontFamily="var(--font-body)"
        fill={INK_MUTED}
      >
        {points[0].date.slice(5).replace("-", "/")}
      </text>
      <text
        x={W - PAD.right}
        y={H - 6}
        textAnchor="end"
        fontSize={10}
        fontWeight={600}
        fontFamily="var(--font-body)"
        fill={INK_MUTED}
      >
        {points[points.length - 1].date.slice(5).replace("-", "/")}
      </text>

      <defs>
        <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={LINE} stopOpacity={0.28} />
          <stop offset="100%" stopColor={LINE} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#area-fill)" />
      <path
        d={linePath}
        fill="none"
        stroke={LINE}
        strokeWidth={2.4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.length <= 30 &&
        xs.map((x, i) => (
          <circle key={i} cx={x} cy={ys[i]} r={3} fill={SURFACE} stroke={LINE} strokeWidth={1.6} />
        ))}

      {a != null && (
        <g>
          <line
            x1={xs[a]}
            x2={xs[a]}
            y1={PAD.top - 4}
            y2={H - PAD.bottom}
            stroke={SUN}
            strokeWidth={1.2}
            strokeDasharray="1 4"
            strokeLinecap="round"
          />
          <circle cx={xs[a]} cy={ys[a]} r={6} fill={SUN} stroke={SURFACE} strokeWidth={3} />
          <text
            x={tipX}
            y={12}
            textAnchor="middle"
            fontSize={12}
            fontWeight={700}
            fontFamily="var(--font-body)"
            fill={INK}
          >
            {fmt(points[a].value)} {unit}
          </text>
          <text
            x={tipX}
            y={22}
            textAnchor="middle"
            fontSize={9.5}
            fontWeight={600}
            fontFamily="var(--font-body)"
            fill={INK_MUTED}
          >
            {points[a].date}
          </text>
        </g>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------

export default function GraphClient({ exercises }: { exercises: ExOption[] }) {
  const [exerciseId, setExerciseId] = useState<number | null>(
    () =>
      (
        exercises.find((e) => e.inPlan && e.hasData) ??
        exercises.find((e) => e.hasData) ??
        exercises[0]
      )?.id ?? null,
  );
  const [metric, setMetric] = useState<Metric>("estimated1RM");
  const [data, setData] = useState<Point[]>([]);
  const [loading, setLoading] = useState(false);
  const cache = useRef(new Map<number, Point[]>());

  useEffect(() => {
    if (exerciseId == null) return;
    const cached = cache.current.get(exerciseId);
    if (cached) {
      setData(cached);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/graph?exerciseId=${exerciseId}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const points = json.points ?? [];
        cache.current.set(exerciseId, points);
        setData(points);
      })
      .catch(() => {
        if (!cancelled) setData([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  const meta = METRICS.find((m) => m.key === metric)!;

  const summary = useMemo(() => {
    if (data.length === 0) return null;
    const values = data.map((d) => d[metric]);
    const latest = values[values.length - 1];
    const first = values[0];
    const delta = latest - first;
    const pct = first > 0 ? delta / first : 0;
    return { latest, delta, pct, best: Math.max(...values), sessions: data.length };
  }, [data, metric]);

  const chartPoints = useMemo(
    () => data.map((d) => ({ date: d.date, value: d[metric] })),
    [data, metric],
  );

  if (exercises.length === 0) {
    return <div className="card">No weighted exercises to chart yet.</div>;
  }

  const inPlan = exercises.filter((e) => e.inPlan);
  const others = exercises.filter((e) => !e.inPlan);
  const option = (e: ExOption) => (
    <option key={e.id} value={e.id}>
      {e.name}
      {e.hasData ? "" : " · no data yet"}
    </option>
  );

  return (
    <>
      <select
        aria-label="Exercise"
        value={exerciseId ?? ""}
        onChange={(e) => setExerciseId(Number(e.target.value))}
        style={{ marginBottom: 10 }}
      >
        {inPlan.length > 0 && <optgroup label="Current split">{inPlan.map(option)}</optgroup>}
        {others.length > 0 && <optgroup label="Other lifts">{others.map(option)}</optgroup>}
      </select>

      <div className="segmented" role="group" aria-label="Metric">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            aria-pressed={metric === m.key}
            onClick={() => setMetric(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: "18px 12px 10px" }}>
        {summary && (
          <div style={{ padding: "0 6px 6px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
            <div>
              <span className="card-label">Latest · {meta.label}</span>
              <div className="dot" style={{ fontSize: 52, marginTop: 8 }}>
                {fmt(summary.latest)}
                <span style={{ fontFamily: "var(--font-body)", fontSize: 16, fontWeight: 600, color: "var(--text-2)", marginLeft: 6 }}>
                  {meta.unit}
                </span>
              </div>
            </div>
            <span className={`chip ${summary.delta >= 0 ? "good" : "bad"}`}>
              {summary.delta >= 0 ? "▲" : "▼"} {Math.abs(Math.round(summary.pct * 100))}%
            </span>
          </div>
        )}
        {loading ? (
          <div className="skel" style={{ height: 210, margin: "6px" }} />
        ) : chartPoints.length === 0 ? (
          <p className="muted" style={{ padding: "48px 24px", textAlign: "center" }}>
            No logged sets for this lift yet. Log a workout and it starts tracking.
          </p>
        ) : (
          <>
            <LineChart points={chartPoints} unit={meta.unit} />
            <p className="faint" style={{ fontSize: 11.5, textAlign: "center", margin: "4px 0 2px" }}>
              Press and drag to read values
            </p>
          </>
        )}
      </div>

      {summary && (
        <div className="tiles-3">
          <div className="card">
            <div className="stat-k">Best</div>
            <div className="dot stat-v" style={{ fontSize: 24 }}>{fmt(summary.best)}</div>
          </div>
          <div className="card">
            <div className="stat-k">Change</div>
            <div className="dot stat-v" style={{ fontSize: 24, color: summary.delta >= 0 ? "var(--good)" : "var(--bad)" }}>
              {summary.delta >= 0 ? "+" : "−"}
              {fmt(Math.abs(summary.delta))}
            </div>
          </div>
          <div className="card">
            <div className="stat-k">Sessions</div>
            <div className="dot stat-v" style={{ fontSize: 24 }}>{summary.sessions}</div>
          </div>
        </div>
      )}
    </>
  );
}
