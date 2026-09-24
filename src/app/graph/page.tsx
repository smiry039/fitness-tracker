import { getExercises, getLoggedExerciseIds, getRoutine } from "@/lib/data";
import GraphClient from "./GraphClient";

export const dynamic = "force-dynamic";

export default async function GraphPage() {
  const [exercises, routine, logged] = await Promise.all([
    getExercises(),
    getRoutine(),
    getLoggedExerciseIds(),
  ]);

  // Order: lifts in the current split first (in program order), then the rest.
  const planOrder = new Map<number, number>();
  routine
    .filter((d) => d.dayOfWeek !== null)
    .flatMap((d) => d.exercises)
    .forEach((re) => {
      if (!planOrder.has(re.exerciseId)) planOrder.set(re.exerciseId, planOrder.size);
    });

  // Weighted lifts are where progress graphs are meaningful.
  const options = exercises
    .filter((e) => e.kind === "weight")
    .map((e) => ({
      id: e.id,
      name: e.name,
      inPlan: planOrder.has(e.id),
      hasData: logged.has(e.id),
    }))
    .sort(
      (a, b) =>
        (planOrder.get(a.id) ?? 1e9) - (planOrder.get(b.id) ?? 1e9) ||
        a.name.localeCompare(b.name),
    );

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">Best set per session</p>
          <h1>Progress</h1>
        </div>
      </header>
      <GraphClient exercises={options} />
    </>
  );
}
