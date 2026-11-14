import { withToken, json } from "@/lib/walkthrough/http";
import { deleteMedia } from "@/lib/walkthrough/uploads";
import { BRAND } from "@/lib/p4/flags";

export const runtime = "nodejs";

export async function DELETE(req: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  return withToken(req, token, async (r) => {
    const res = await deleteMedia(BRAND, r, id, "customer");
    return res.ok ? json({ ok: true }) : json({ ok: false, error: res.status === 409 ? "Already submitted. Add a correction instead." : "Not found" }, res.status);
  });
}
