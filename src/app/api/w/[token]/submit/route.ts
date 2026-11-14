import { withToken, json } from "@/lib/walkthrough/http";
import { submitSession } from "@/lib/walkthrough/service";
import { BRAND } from "@/lib/p4/flags";

export const runtime = "nodejs";

/** Idempotent: a second submit returns ok with duplicate=true. The receipt never includes a price or estimate. */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return withToken(req, token, async (r) => {
    const res = await submitSession(BRAND, r);
    return json({ ok: true, duplicate: res.duplicate, message: "Thanks. Your walkthrough is in. Our estimator will review it and contact you about next steps." });
  }, 60);
}
