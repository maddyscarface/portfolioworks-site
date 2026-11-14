/**
 * DataMoon API facts, checked against the public docs on 14 Nov 2026 (Asia/Karachi):
 *   Main API   https://docs.datamoon.com/api            (OpenAPI bundled in the docs site)
 *   Intent API https://intentdocs.datamoon.com/         (OpenAPI bundled in the docs site)
 *   Webhooks   https://intentdocs.datamoon.com/webhooks
 * Anything not confirmed there is marked UNVERIFIED and is blocked from live activation.
 * Re-check before purchase: vendor docs change.
 */
export const DOCS_CHECKED_AT = "2026-11-14";

export const MAIN = {
  base: "https://app.datamoon.com/api/v2",
  auth: {
    module: { header: "X-Api-Key", paths: ["/v2/m/*", "/v2/ext/*"], env: "DATAMOON_MAIN_MODULE_KEY" },
    legacy: { param: "api_key", note: "query, form field or JSON body; we send it in the JSON body only (never a query string)", paths: ["/v2/GetDataBy*", "/v2/results"], env: "DATAMOON_LEGACY_KEY" },
    topics: { none: true, paths: ["/v2/b2b-topics/search", "/v2/b2c-topics/search"] },
  },
  endpoints: {
    topicSearchB2B: { method: "GET", path: "/b2b-topics/search", query: ["keywords (required, min 3)", "mode: auto|keyword|semantic"], documented: true },
    topicSearchB2C: { method: "GET", path: "/b2c-topics/search", query: ["keywords (required, min 3)", "mode: auto|keyword|semantic"], documented: true },
    buildModule: { method: "POST", path: "/m/audiences/build", documented: true },
    buildExt: { method: "POST", path: "/ext/audiences/build", documented: true },
    listModule: { method: "GET", path: "/m/audiences/fetch", documented: true },
    pollModule: { method: "GET", path: "/m/audiences/fetch/{id}", documented: true },
    exportModule: { method: "POST", path: "/m/audiences/manage/{id}/export", documented: true },
    savedQueries: { method: "GET", path: "/m/saved-queries", documented: true },
    enrichEmail: { method: "POST", path: "/GetDataByEmail", documented: true },
  },
  constraints: { maxTopicIds: 5, eventDateMaxDays: 14, recordLimitMax: 1_000_000, extOutputFields: 13, monthlyBudgetPerModuleKey: true },
  errors: { 400: "missing API key", 403: "invalid key or feature not enabled", 404: "not found / not owned", 422: "validation error or monthly record limit exceeded", 500: "server error" },
  /** Documented BuildAudienceRequest filter field enum (subset relevant here). */
  documentedFields: ["event_date", "topic_id", "score_category", "category", "subcategory", "personal_state", "personal_zip", "personal_city", "homeowner", "job_title", "seniority_level", "department", "company_name", "company_domain", "company_revenue", "company_employee_count", "primary_industry", "company_naics", "company_sic", "company_state", "company_city", "company_zip", "gender", "age_range", "married", "children", "income_range", "net_worth"],
  unverified: [
    "Topic search returns topic strings; BuildAudienceRequest.topic_ids expects integers. How a returned topic maps to an integer ID is UNVERIFIED.",
    "Property/home-age/property-value criteria are NOT in the documented main filter enum (only `homeowner` y/n/p). Age-of-home and property value are UNVERIFIED.",
    "Coverage/record volume for Greater Boston ZIPs is UNVERIFIED until a preview/count is run with a purchased key.",
  ],
} as const;

export const INTENT = {
  base: "https://intentapi.datamoon.com",
  auth: { header: "X-API-Key", env: "DATAMOON_INTENT_KEY" },
  endpoints: {
    listFeeds: { method: "GET", path: "/intent/feeds", documented: true },
    feed: { method: "GET", path: "/intent/feeds/{feed_id}", documented: true },
    credits: { method: "GET", path: "/organization/credits", documented: true },
    feedLimit: { method: "GET", path: "/organization/feed-limit", documented: true },
    builder: { method: "POST", path: "/intent/feeds/builder", documented: true },
    stats: { method: "POST", path: "/intent/feeds/stats", documented: true, note: "auto_export can create an export (consumes credits): never set" },
    exportPreview: { method: "POST", path: "/intent/feeds/exports/preview", documented: true },
    exportCount: { method: "POST", path: "/intent/feeds/exports/count", documented: true, note: "listed in the guide; not present in the bundled OpenAPI path list (UNVERIFIED)" },
    exportCreate: { method: "POST", path: "/intent/feeds/exports", documented: true, note: "reserves records from the org credit pool" },
    exportList: { method: "POST", path: "/intent/feeds/exports/list", documented: true },
    exportPage: { method: "POST", path: "/intent/feeds/exports/page", documented: true },
    exportDownloadUrl: { method: "POST", path: "/intent/feeds/exports/download-url", documented: true, note: "URL valid 1 hour; 410 when source expired" },
    consumerFields: { method: "POST", path: "/intent/feeds/filters/consumer/fields", documented: true },
    consumerValues: { method: "POST", path: "/intent/feeds/filters/consumer/values", documented: true },
    businessFields: { method: "POST", path: "/intent/feeds/filters/business/fields", documented: true },
    businessValues: { method: "POST", path: "/intent/feeds/filters/business/values", documented: true },
    bundles: { method: "GET", path: "/enrich/bundles", documented: true },
    webhooks: { method: "POST", path: "/webhooks", documented: true, note: "mode create|test; org-wide export.ready only" },
  },
  exportStatuses: ["building", "ready", "expired", "source_expired"],
  exportOptions: { pageSizeMin: 1000, pageSizeMax: 50000, artifactTtlHours: 24, downloadUrlTtlMinutes: 60 },
  webhook: { headers: ["Webhook-Id", "Webhook-Timestamp", "Webhook-Signature"], signature: "v1=<hex HMAC-SHA256 over timestamp + '.' + raw body, secret = full whsec_ string>", toleranceSeconds: 300, retries: "1m, 5m, 30m, 2h, 12h (max 6 attempts)", ackWithinSeconds: 10, testDeliveries: "unsigned, test: true, dummy ids: never ingest" },
  errors: { 401: "invalid or inactive key", 403: "permission, size, quota, credit or bundle entitlement exceeded", 410: "source window expired", 422: "validation", 429: "rate limit; honour Retry-After" },
  unverified: ["Exact consumer/business filter field keys must be discovered per org via the /filters/*/fields endpoints. None are hard-coded."],
} as const;

/** Fields we refuse to use for targeting (sensitive or financial-eligibility modelling), even though some are documented. */
export const PROHIBITED_FIELDS = ["gender", "age_range", "married", "children", "income_range", "net_worth", "financial", "donor", "political", "ethnicity", "religion"] as const;
/** Enrichment bundles we never request for PortfolioWorks (financial / sensitive). */
export const PROHIBITED_BUNDLES = ["financial", "donor", "political", "auto"] as const;
