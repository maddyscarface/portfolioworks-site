import { withToken, json, readJson } from "@/lib/walkthrough/http";
import { correctSubmitted } from "@/lib/walkthrough/service";
import { BRAND } from "@/lib/p4/flags";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return withToken(req, token, async (r) => {
    let body: unknown;
    try { body = await readJson(req); } catch { return json({ ok: false, error: "Too long" }, 413); }
    const res = await correctSubmitted(BRAND, r, body);
    return json(res, res.ok ? 200 : 409);
  }, 60);
}
