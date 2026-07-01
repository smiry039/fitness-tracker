import { NextResponse } from "next/server";
import { getRoutine } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const routine = await getRoutine();
  return NextResponse.json({ routine });
}
