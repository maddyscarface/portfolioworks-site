/**
 * SYNTHETIC FIXTURES. Invented, clearly fake records for demos and tests only. Not DataMoon data, not real people.
 * Emails use the reserved example.invalid domain; contact ids follow the documented `id_` + 16 hex shape.
 */
export const SYNTHETIC_LABEL = "SYNTHETIC DEMO DATA: not real people, not DataMoon output";

export const FIXTURE_TOPICS = {
  b2c: ["[synthetic] rental property maintenance", "[synthetic] apartment turnover", "[synthetic] landlord repairs", "[synthetic] rental unit renovation"],
  b2b: ["[synthetic] property management", "[synthetic] make-ready services", "[synthetic] condominium association management"],
};

export const FIXTURE_FEEDS = [
  { id: "00000000-0000-4000-8000-00000000d001", name: "[synthetic] Landlord turnover intent · MA", kind: "consumer" },
  { id: "00000000-0000-4000-8000-00000000d002", name: "[synthetic] Property managers · MA", kind: "business" },
];

export const FIXTURE_CREDITS = { record_limit: 5000, records_used: 1200, remaining: 3800, reset_period: "lifetime" };

export const FIXTURE_EXPORT_CSV = [
  "contact_id,first_name,last_name,personal_emails,personal_city,personal_state,personal_zip,topic,score_category",
  "id_0000000000000a01,Avery,Example,avery.example@example.invalid,Newton,MA,02458,[synthetic] apartment turnover,high",
  "id_0000000000000a02,Blake,Sample,blake.sample@example.invalid,Brookline,MA,02445,[synthetic] landlord repairs,medium",
  "id_0000000000000a03,Casey,Fixture,,Quincy,MA,02169,[synthetic] rental unit renovation,low",
  "id_0000000000000a01,Avery,Example,avery.example@example.invalid,Newton,MA,02458,[synthetic] apartment turnover,high",
  "not_an_id,Drew,Invalid,drew@example.invalid,Boston,MA,02110,[synthetic] rental property maintenance,high",
  "id_0000000000000a04,Emery,Optout,emery.optout@example.invalid,Waltham,MA,02451,[synthetic] apartment turnover,medium",
].join("\n");

export function fixtureWebhookEvent(over: Partial<{ id: string; feed_id: string | null; test: boolean }> = {}) {
  return {
    id: over.id ?? "evt_synthetic_0001", type: "export.ready", test: over.test ?? false, created_at: new Date().toISOString(),
    data: { export_id: "00000000-0000-4000-8000-00000000e001", feed_id: over.feed_id === undefined ? FIXTURE_FEEDS[0].id : over.feed_id, row_count: 6, download_url: "https://storage.example/synthetic", download_expires_at: new Date(Date.now() + 3600_000).toISOString() },
  };
}
