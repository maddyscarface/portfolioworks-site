ChatGPT ads (OpenAI pixel + Conversions API) + pre-estimate qualifier end-to-end test.

What it checks (per site): consent set before pixel init; exactly one browser lead_created;
one Conversions API lead_created with the SAME event id (dedup); obref/oppref forwarded; email
hashed; validate_only honoured; team lead-brief email; no re-fire on thank-you reload; no page
errors; ads-consent DECLINED → no pixel conversion and no server event (all four sites); CRM stage
webhook → OpenAI stage event; /api/health responds. BuildGhana also checks the price-guide view
is counted. All OpenAI/Resend traffic goes to a local mock on :4999 — nothing leaves the machine.

Run (from the project root):
  npm ci
  npx playwright install chromium        # once (or: export PW_CHANNEL=chrome)
  npm run e2e:chatgpt-ads                # builds with NEXT_PUBLIC_OPENAI_PIXEL_ID=px_e2e, runs, stops

All four sites side by side (folder containing buildghana/, deckcraft/, portfolioworks/, stonecraft/
or the *-chatgpt-ads-qualifiers/<name>/ layout), each with npm ci done:
  E2E_ROOT=/path/to/folder npm run e2e:chatgpt-ads

Manual: bash tests/e2e-chatgpt-ads/start.sh (E2E_BUILD=1 to rebuild) → SITES=… node
tests/e2e-chatgpt-ads/e2e.mjs → bash tests/e2e-chatgpt-ads/stop.sh. Results: /tmp/e2e-results.json.
Ports: buildghana 3101, deckcraft 3102, portfolioworks 3103, stonecraft 3104, mock 4999.
The production build used for e2e has the test pixel id baked in — rebuild (npm run build) before deploying.
