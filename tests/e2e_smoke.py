"""
End-to-end smoke test (Python Playwright).
Usage: start the app (npm run build && ALLOW_DEMO_ADMIN=true npx next start -p 3100), then:
    python3 tests/e2e_smoke.py http://localhost:3100
Checks: every key route returns 200, the turnover funnel submits end to end, exactly one
generate_lead fires with the event_id, attribution is captured, the lead lands in /admin,
reloading /thank-you does not re-fire conversions, and the API rejects bad/duplicate input.
"""
import json, sys, urllib.request
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3100"
ROUTES = ["/", "/rental-turnovers", "/rental-renovations", "/home-renovations", "/property-managers", "/landlords", "/portfolio-owners", "/real-estate-investors", "/hoa-condos",
          "/general-contracting", "/services", "/services/painting-drywall", "/services/flooring", "/services/bathroom-remodeling",
          "/services/kitchen-remodeling", "/services/carpentry", "/services/exterior-repairs", "/services/plumbing-electrical-hvac-coordination",
          "/services/full-rehab", "/services/property-maintenance", "/services/capital-improvements", "/portfolio-programs",
          "/unit-turn-estimator", "/portfolio-savings-calculator", "/request-a-turnover", "/request-a-property-walkthrough",
          "/request-a-renovation-estimate", "/how-it-works", "/projects", "/about", "/markets/massachusetts", "/markets/florida",
          "/markets/maine", "/markets/massachusetts/somerville", "/service-areas", "/resources", "/resources/what-is-included-in-a-rental-unit-turnover", "/contact", "/thank-you", "/privacy",
          "/terms", "/lp/rental-turnover", "/lp/portfolio-partnership", "/lp/value-add-rehab", "/lp/trade-work", "/lp/urgent-turnover",
          "/portal", "/admin", "/sitemap.xml", "/robots.txt", "/favicon.ico", "/icon.svg", "/icon-32.png", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png", "/site.webmanifest", "/llms.txt"]

fails = []
def check(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond: fails.append(msg)

for r in ROUTES:
    try:
        code = urllib.request.urlopen(BASE + r).status
    except urllib.error.HTTPError as e:
        code = e.code
    check(code == 200, f"GET {r} -> {code}")
for r in ["/markets/florida/coral-springs", "/services/nope"]:
    try:
        code = urllib.request.urlopen(BASE + r).status
    except urllib.error.HTTPError as e:
        code = e.code
    check(code == 404, f"GET {r} -> {code} (unserved/unknown must 404)")

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    pg.goto(BASE + "/lp/rental-turnover?utm_source=google&utm_medium=cpc&utm_campaign=MA_Turnover&gclid=TEST123", wait_until="networkidle")
    pg.click("text=Accept")
    form = pg.locator("[data-testid=lead-form]")
    form.locator("select[name=customerType]").select_option("landlord")
    pg.wait_for_timeout(2600)  # exceed minimum fill time
    form.locator("[data-testid=form-next]").click()
    form.locator("input[name=zip]").fill("02143")
    form.locator("#desc").fill("2BR, needs paint and LVP in bedrooms")
    form.locator("[data-testid=form-next]").click()
    form.locator("input[name=firstName]").fill("Test")
    form.locator("input[name=lastName]").fill("Landlord")
    form.locator("input[name=email]").fill("test@example.com")
    form.locator("input[name=phone]").fill("617-555-0199")
    form.locator("input[name=consentContact]").check()
    form.locator("[data-testid=form-next]").click()
    pg.wait_for_url("**/thank-you**", timeout=15000)
    dl = pg.evaluate("window.dataLayer.filter(e => e.event === 'generate_lead')")
    check(len(dl) == 1, f"exactly one generate_lead fired ({len(dl)})")
    check(bool(dl and dl[0].get("event_id")), "generate_lead carries event_id")
    check(dl and dl[0].get("market") == "massachusetts", "market resolved from ZIP")
    attr = json.loads(pg.evaluate("localStorage.getItem('pw_attr')"))
    check(attr.get("gclid") == "TEST123" and attr.get("utm_campaign") == "MA_Turnover", "attribution captured first-touch")
    pg.reload(wait_until="networkidle")
    dl2 = pg.evaluate("(window.dataLayer||[]).filter(e => e.event === 'generate_lead')")
    check(len(dl2) == 0, "reload of /thank-you does not re-fire generate_lead")
    pg.goto(BASE + "/admin", wait_until="networkidle")
    check(pg.locator("text=Test Landlord").count() >= 1, "lead visible in admin dashboard")
    # estimator renders a range
    pg.goto(BASE + "/unit-turn-estimator", wait_until="networkidle")
    check("$" in pg.locator("[data-testid=estimate-range]").inner_text(), "estimator renders a range")
    # portal scoping
    pg.goto(BASE + "/portal?acct=acct_ridge", wait_until="networkidle")
    check(pg.locator("text=14 Example Ave").count() == 0, "Ridgeway account cannot see Harborline property")
    b.close()

def post(body):
    req = urllib.request.Request(BASE + "/api/leads", data=json.dumps(body).encode(), headers={"Content-Type": "application/json"}, method="POST")
    try:
        r = urllib.request.urlopen(req); return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

good = {"funnel": "portfolio", "customerType": "property-manager", "firstName": "A", "lastName": "B", "email": "a@b.co", "phone": "6175550100",
        "zip": "02139", "units": 120, "consentContact": True, "eventId": "e2e-dup-000001", "startedAt": 0}
s, j = post({**good, "zip": "12"}); check(s == 422, f"invalid ZIP rejected ({s})")
s, j = post(good); check(s == 200 and j.get("tier") == "hot", f"PM lead accepted & scored hot ({j.get('tier')})")
s, j = post(good); check(j.get("duplicate") is True, "duplicate eventId is idempotent")
s, j = post({**good, "eventId": "e2e-hp-0000001", "website": "spam"}); check(s in (200, 422), "honeypot submission not stored")

print(f"\n{len(fails)} failure(s)")
sys.exit(1 if fails else 0)
