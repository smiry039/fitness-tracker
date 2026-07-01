"use client";

import { useEffect, useState } from "react";
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

const METRIC_LABEL: Record<Metric, string> = {
  estimated1RM: "Est. 1RM (kg)",
  topWeight: "Top set (kg)",
  totalVolume: "Volume (kg)",
};

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

  if (exercises.length === 0) {
    return <div className="panel">No weighted exercises to chart yet.</div>;
  }

  return (
    <>
      <div className="panel">
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <label>
            Exercise{" "}
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
          <label>
            Metric{" "}
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as Metric)}
            >
              <option value="estimated1RM">Estimated 1RM</option>
              <option value="topWeight">Top set weight</option>
              <option value="totalVolume">Total volume</option>
            </select>
          </label>
        </div>
      </div>

      <div className="panel">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : data.length === 0 ? (
          <p className="muted">
            No logged sets for this exercise yet. Log a workout to see it track.
          </p>
        ) : (
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid stroke="#3a3128" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#a99a82" fontSize={12} />
                <YAxis stroke="#a99a82" fontSize={12} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    background: "#1e1a15",
                    border: "1px solid #3a3128",
                    borderRadius: 8,
                    color: "#ece3d4",
                  }}
                  formatter={(value) => [value as number, METRIC_LABEL[metric]]}
                />
                <Line
                  type="monotone"
                  dataKey={metric}
                  stroke="#c9a24b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </>
  );
}
