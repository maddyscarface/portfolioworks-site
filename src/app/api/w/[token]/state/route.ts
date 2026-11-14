import { withToken, json } from "@/lib/walkthrough/http";
import { publicState } from "@/lib/walkthrough/service";
import { uploadMode } from "@/lib/walkthrough/uploads";
import { BRAND } from "@/lib/p4/flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return withToken(req, token, async (r) => json(await publicState(BRAND, r, uploadMode())));
}
