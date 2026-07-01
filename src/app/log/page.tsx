import { getRoutine } from "@/lib/data";
import LogForm from "./LogForm";

export const dynamic = "force-dynamic";

export default async function LogPage({
  searchParams,
}: {
  searchParams: { day?: string };
}) {
  const routine = await getRoutine();

  // Shape the routine into a plain, serialisable structure for the client.
  const days = routine.map((d) => ({
    id: d.id,
    name: d.name,
    exercises: d.exercises.map((re) => ({
      exerciseId: re.exerciseId,
      name: re.exercise.name,
      kind: re.exercise.kind,
      muscleGroup: re.exercise.muscleGroup,
      targetSets: re.targetSets,
      targetReps: re.targetReps,
      cue: re.cue,
      optional: re.optional,
    })),
  }));

  const preselect = searchParams.day ? Number(searchParams.day) : null;

  return (
    <>
      <h1>Log a workout</h1>
      <p className="muted">
        Fill in the sets you completed. Empty sets are ignored. Weight in kg.
      </p>
      <LogForm days={days} preselectDayId={preselect} />
    </>
  );
}
