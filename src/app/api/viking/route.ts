import { NextResponse } from "next/server";
import { getViking } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const viking = await getViking();
  return NextResponse.json(viking);
}
