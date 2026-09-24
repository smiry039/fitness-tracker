import { getLastSetsForExercises, getRoutine } from "@/lib/data";
import LogForm from "./LogForm";

export const dynamic = "force-dynamic";

export default async function LogPage({
  searchParams,
}: {
  searchParams: { day?: string };
}) {
  const routine = await getRoutine();

  // Last-session numbers for every exercise in the program, so the form can
  // prefill and show "last time" — repeat performances become one tap.
  const allExerciseIds = [
    ...new Set(routine.flatMap((d) => d.exercises.map((re) => re.exerciseId))),
  ];
  const lastSets = await getLastSetsForExercises(allExerciseIds);

  // Shape the routine into a plain, serialisable structure for the client.
  const days = routine.map((d) => ({
    id: d.id,
    name: d.name,
    focus: d.focus,
    dayOfWeek: d.dayOfWeek,
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
      <header className="page-head">
        <div>
          <p className="eyebrow">Tick sets as you go</p>
          <h1>Log workout</h1>
        </div>
      </header>
      <LogForm days={days} preselectDayId={preselect} lastSets={lastSets} />
    </>
  );
}
