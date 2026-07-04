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
      <p className="eyebrow">Log a workout</p>
      <h1 className="screen-title">
        Every set <span className="accent">counts.</span>
      </h1>
      <p className="screen-sub">
        Tick the sets you did — tweak with the steppers. Weight in kg.
      </p>
      <LogForm days={days} preselectDayId={preselect} lastSets={lastSets} />
    </>
  );
}
