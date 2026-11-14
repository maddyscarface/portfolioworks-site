import { withToken, json, readJson } from "@/lib/walkthrough/http";
import { initUpload } from "@/lib/walkthrough/uploads";
import { BRAND } from "@/lib/p4/flags";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return withToken(req, token, async (r) => {
    const body = (await readJson(req, 4000).catch(() => ({}))) as { step_id?: string; mime?: string; size?: number; name?: string };
    const res = await initUpload(BRAND, r, body);
    return res.ok ? json(res) : json({ ok: false, error: res.error, ...("reason" in res ? { reason: res.reason } : {}) }, res.status);
  }, 400);
}
