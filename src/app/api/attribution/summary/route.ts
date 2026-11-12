import { NextResponse, type NextRequest } from "next/server";
import { listRevenue, summarize } from "@/lib/attribution/revenue";
import { reportAuth } from "../auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const a = reportAuth(req);
  if (a !== "ok") return NextResponse.json({ ok: false }, { status: a === "disabled" ? 404 : 401 });
  return NextResponse.json({ ok: true, ...summarize(await listRevenue()) });
}
