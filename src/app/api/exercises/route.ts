import { NextResponse } from "next/server";
import { getExercises } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const exercises = await getExercises();
  return NextResponse.json({ exercises });
}
