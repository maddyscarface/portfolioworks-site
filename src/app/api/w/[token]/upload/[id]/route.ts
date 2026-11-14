import { withToken, json } from "@/lib/walkthrough/http";
import { putChunk, uploadStatus } from "@/lib/walkthrough/uploads";
import { LIMITS } from "@/lib/uploads/media";
import { BRAND } from "@/lib/p4/flags";

export const runtime = "nodejs";

type P = { params: Promise<{ token: string; id: string }> };

/** Resume support: which chunks the server already has. */
export async function GET(req: Request, { params }: P) {
  const { token, id } = await params;
  return withToken(req, token, async (r) => {
    const s = await uploadStatus(BRAND, r, id);
    return s ? json({ ok: true, ...s }) : json({ ok: false, error: "Upload not found" }, 404);
  }, 2000);
}

/** One ≤3.5 MB chunk (raw bytes). */
export async function PUT(req: Request, { params }: P) {
  const { token, id } = await params;
  return withToken(req, token, async (r) => {
    const len = Number(req.headers.get("content-length") ?? 0);
    if (len > LIMITS.chunk) return json({ ok: false, error: "Chunk too large" }, 413);
    const index = Number(new URL(req.url).searchParams.get("index"));
    const bytes = Buffer.from(await req.arrayBuffer());
    const res = await putChunk(BRAND, r, id, index, bytes);
    return res.ok ? json(res) : json({ ok: false, error: res.error }, res.status);
  }, 2000);
}
