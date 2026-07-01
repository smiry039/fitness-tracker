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
      <h1>Progress</h1>
      <p className="muted">
        Per-session best set for a lift. Estimated 1RM uses the Epley formula.
      </p>
      <GraphClient exercises={options} />
    </>
  );
}
