import { NextResponse } from "next/server";
import { getExerciseProgress } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("exerciseId");
  const exerciseId = raw ? Number(raw) : NaN;

  if (!Number.isInteger(exerciseId)) {
    return NextResponse.json(
      { error: "`exerciseId` query param is required" },
      { status: 400 },
    );
  }

  const points = await getExerciseProgress(exerciseId);
  return NextResponse.json({ exerciseId, points });
}
