import { NextResponse } from "next/server";
import { getSessionsForMonth } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year = Number(searchParams.get("y")) || now.getFullYear();
  const month = Number(searchParams.get("m")) || now.getMonth() + 1;

  if (month < 1 || month > 12) {
    return NextResponse.json({ error: "month must be 1-12" }, { status: 400 });
  }

  const sessions = await getSessionsForMonth(year, month);
  return NextResponse.json({ year, month, sessions });
}
