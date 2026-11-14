import { withToken, json, readJson } from "@/lib/walkthrough/http";
import { saveProgress } from "@/lib/walkthrough/service";
import { BRAND } from "@/lib/p4/flags";

export const runtime = "nodejs";

/** Autosave. Never consumes the link; safe to call repeatedly (last write wins for the customer's own draft). */
export async function PUT(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return withToken(req, token, async (r) => {
    let body: unknown;
    try { body = await readJson(req); } catch { return json({ ok: false, error: "That was too much to save at once." }, 413); }
    const res = await saveProgress(BRAND, r, body);
    return json(res, res.ok ? 200 : 409);
  }, 600);
}
