import { NextResponse } from "next/server";
import { createSession, getRecentSessions } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessions = await getRecentSessions(30);
  return NextResponse.json({ sessions });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  if (!Array.isArray(b.sets)) {
    return NextResponse.json(
      { error: "`sets` must be an array" },
      { status: 400 },
    );
  }
  if (b.sets.length > 200) {
    return NextResponse.json({ error: "Too many sets" }, { status: 400 });
  }

  // Bounded, positive number or undefined. Rejects NaN/Infinity/negatives and
  // anything past a sane ceiling so a bad payload can't poison the data.
  const num = (v: unknown, max: number): number | undefined => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > max) return undefined;
    return n;
  };

  const sets = [];
  for (const raw of b.sets) {
    if (typeof raw !== "object" || raw === null) continue;
    const s = raw as Record<string, unknown>;
    const exerciseId = Number(s.exerciseId);
    if (!Number.isInteger(exerciseId) || exerciseId <= 0) continue;
    sets.push({
      exerciseId,
      setNumber: num(s.setNumber, 1000),
      reps: num(s.reps, 10000),
      weight: num(s.weight, 100000),
      durationSec: num(s.durationSec, 86400),
    });
  }

  const routineDayId =
    b.routineDayId == null ? null : Number(b.routineDayId) || null;
  const notes =
    typeof b.notes === "string" ? b.notes.slice(0, 2000) : null;
  const date = typeof b.date === "string" ? b.date : null;

  try {
    const result = await createSession({ routineDayId, date, notes, sets });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to save session";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
