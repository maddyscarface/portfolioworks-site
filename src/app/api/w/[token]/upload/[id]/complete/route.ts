import { withToken, json } from "@/lib/walkthrough/http";
import { completeUpload } from "@/lib/walkthrough/uploads";
import { BRAND } from "@/lib/p4/flags";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  return withToken(req, token, async (r) => {
    const res = await completeUpload(BRAND, r, id);
    return res.ok ? json({ ok: true, media_id: res.media_id }) : json({ ok: false, error: res.error, received: "received" in res ? res.received : undefined }, res.status);
  }, 400);
}
