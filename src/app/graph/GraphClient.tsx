"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ExOption {
  id: number;
  name: string;
  muscleGroup: string;
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

// Palette tokens; copper validated ≥3:1 against the raised surface.
const COPPER = "#c77b43";
const GRID = "#2c3036";
const INK_MUTED = "#8a9099";

export default function GraphClient({ exercises }: { exercises: ExOption[] }) {
  const [exerciseId, setExerciseId] = useState<number | null>(
    exercises[0]?.id ?? null,
  );
  const [metric, setMetric] = useState<Metric>("estimated1RM");
  const [data, setData] = useState<Point[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (exerciseId == null) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/graph?exerciseId=${exerciseId}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setData(json.points ?? []);
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
    const best = Math.max(...values);
    const first = values[0];
    const delta = latest - first;
    return { latest, best, delta, sessions: data.length };
  }, [data, metric]);

  if (exercises.length === 0) {
    return <div className="card">No weighted exercises to chart yet.</div>;
  }

  return (
    <>
      <label className="field" style={{ marginBottom: 10 }}>
        <span>Exercise</span>
        <select
          value={exerciseId ?? ""}
          onChange={(e) => setExerciseId(Number(e.target.value))}
        >
          {exercises.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </label>

      <div className="pills" style={{ marginBottom: 12 }} role="group" aria-label="Metric">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            className="pill"
            aria-pressed={metric === m.key}
            onClick={() => setMetric(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {summary && (
        <div className="stat-tiles">
          <div className="tile">
            <div className="k">Latest {meta.label}</div>
            <div className="v">
              {summary.latest} <small>{meta.unit}</small>
            </div>
          </div>
          <div className="tile">
            <div className="k">Change · {summary.sessions} sessions</div>
            <div className="v" style={{ color: summary.delta >= 0 ? "var(--good)" : "var(--danger)" }}>
              {summary.delta >= 0 ? "+" : ""}
              {Math.round(summary.delta * 10) / 10} <small>{meta.unit}</small>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: "16px 8px 8px 0" }}>
        {loading ? (
          <p className="muted" style={{ padding: "40px 24px" }}>
            Loading…
          </p>
        ) : data.length === 0 ? (
          <p className="muted" style={{ padding: "40px 24px" }}>
            No logged sets for this lift yet. Log a workout and it starts
            tracking.
          </p>
        ) : (
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <LineChart
                data={data}
                margin={{ top: 8, right: 16, bottom: 4, left: -6 }}
              >
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke={INK_MUTED}
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: GRID }}
                  tickFormatter={(d: string) => d.slice(5).replace("-", "/")}
                />
                <YAxis
                  stroke={INK_MUTED}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={["auto", "auto"]}
                  width={44}
                />
                <Tooltip
                  cursor={{ stroke: INK_MUTED, strokeDasharray: "3 3" }}
                  contentStyle={{
                    background: "#15171a",
                    border: "1px solid #2c3036",
                    borderRadius: 10,
                    color: "#eceae4",
                    fontSize: 13,
                  }}
                  labelStyle={{ color: INK_MUTED, fontSize: 11 }}
                  formatter={(value) => [
                    `${value} ${meta.unit}`,
                    meta.label,
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey={metric}
                  stroke={COPPER}
                  strokeWidth={2}
                  dot={{ r: 3, fill: COPPER, strokeWidth: 0 }}
                  activeDot={{ r: 5, stroke: "#1e2126", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </>
  );
}
