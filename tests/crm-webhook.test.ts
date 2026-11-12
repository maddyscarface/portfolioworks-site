import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/crm-webhook/route";
import { listRevenue } from "@/lib/attribution/revenue";
import { storeLead } from "@/lib/integrations";

const req = (body: unknown, secret = "s3cret") =>
  new NextRequest("http://localhost/api/crm-webhook", { method: "POST", headers: { "content-type": "application/json", "x-pw-webhook-secret": secret }, body: JSON.stringify(body) });

afterEach(() => { delete process.env.CRM_WEBHOOK_SECRET; vi.restoreAllMocks(); });

describe("CRM webhook (revenue attribution)", () => {
  it("rejects without the shared secret", async () => {
    process.env.CRM_WEBHOOK_SECRET = "s3cret";
    expect((await POST(req({ stage: "purchase" }, "nope"))).status).toBe(401);
  });
  it("records revenue once with the lead's attribution and acknowledges GHL retries as duplicates", async () => {
    process.env.CRM_WEBHOOK_SECRET = "s3cret";
    await storeLead({ eventId: "lead-rev-1", email: "o@example.com", attribution: { gclid: "G-123", utm_source: "google", utm_medium: "cpc" } });
    const first = await (await POST(req({ eventId: "lead-rev-1", stage: "contract_signed", value: 18000 }))).json();
    expect(first.ok).toBe(true);
    expect(first.revenue).toMatchObject({ recorded: true, firstChannel: "paid_search_google" });
    const retry = await (await POST(req({ eventId: "lead-rev-1", stage: "contract_signed", value: 18000 }))).json();
    expect(retry.duplicate).toBe(true);
    const rev = (await listRevenue()).filter((r) => r.eventId === "lead-rev-1");
    expect(rev).toHaveLength(1);
    expect(rev[0]).toMatchObject({ value: 18000, gclid: "G-123" });
  });
  it("rejects a negative value", async () => {
    process.env.CRM_WEBHOOK_SECRET = "s3cret";
    expect((await POST(req({ eventId: "x1", stage: "purchase", value: -5 }))).status).toBe(400);
  });
});
