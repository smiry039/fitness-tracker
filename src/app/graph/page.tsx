import { getExercises } from "@/lib/data";
import GraphClient from "./GraphClient";

export const dynamic = "force-dynamic";

export default async function GraphPage() {
  const exercises = await getExercises();
  // Weighted lifts are where progress graphs are meaningful.
  const options = exercises
    .filter((e) => e.kind === "weight")
    .map((e) => ({ id: e.id, name: e.name, muscleGroup: e.muscleGroup }));

  return (
    <>
      <p className="eyebrow">Progress</p>
      <h1 className="screen-title">
        Chase the <span className="accent">numbers.</span>
      </h1>
      <p className="screen-sub">
        Per-session best for a lift. Est. 1RM uses the Epley formula.
      </p>
      <GraphClient exercises={options} />
    </>
  );
}
