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

  const b = body as {
    routineDayId?: number | null;
    date?: string | null;
    notes?: string | null;
    sets?: unknown;
  };

  if (!Array.isArray(b.sets)) {
    return NextResponse.json(
      { error: "`sets` must be an array" },
      { status: 400 },
    );
  }

  try {
    const result = await createSession({
      routineDayId: b.routineDayId ?? null,
      date: b.date ?? null,
      notes: b.notes ?? null,
      sets: b.sets as never,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to save session";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
