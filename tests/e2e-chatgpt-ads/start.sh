#!/usr/bin/env bash
# Starts the mock receiver (OpenAI CAPI + SDK + Resend on :4999) and the site(s) under test in
# production mode. Works from any directory; paths are resolved from this script's location.
#
#   Single site (default): the project this script lives in.
#   All four side by side: E2E_ROOT=/folder/containing/all/four bash tests/e2e-chatgpt-ads/start.sh
#     (each site may be at $E2E_ROOT/<name> or $E2E_ROOT/<name>-chatgpt-ads-qualifiers/<name>)
#   E2E_BUILD=1 rebuilds each site with NEXT_PUBLIC_OPENAI_PIXEL_ID=px_e2e first (needed once: the
#   public pixel id is inlined at build time). Writes the chosen site list to /tmp/e2e-sites.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT="$(cd "$HERE/../.." && pwd)"

site_of() { # package.json name → site key
  case "$(node -p "require('$1/package.json').name")" in
    buildghana-abroad) echo buildghana ;; deckcraft-boston) echo deckcraft ;;
    portfolioworks) echo portfolioworks ;; stonecraft-platform) echo stonecraft ;; *) echo unknown ;;
  esac
}
port_of() { case "$1" in buildghana) echo 3101 ;; deckcraft) echo 3102 ;; portfolioworks) echo 3103 ;; stonecraft) echo 3104 ;; esac; }

DIRS=()
if [ -n "${E2E_ROOT:-}" ]; then
  for n in buildghana deckcraft portfolioworks stonecraft; do
    for c in "$E2E_ROOT/$n" "$E2E_ROOT/$n-chatgpt-ads-qualifiers/$n"; do [ -f "$c/package.json" ] && { DIRS+=("$(cd "$c" && pwd)"); break; }; done
  done
else
  DIRS=("$PROJECT")
fi
[ ${#DIRS[@]} -gt 0 ] || { echo "No sites found (E2E_ROOT=${E2E_ROOT:-})" >&2; exit 1; }

export OPENAI_ADS_PIXEL_ID=px_e2e OPENAI_ADS_API_KEY=key_e2e OPENAI_ADS_ENDPOINT=http://127.0.0.1:4999/v1/events OPENAI_ADS_VALIDATE_ONLY=true
export RESEND_API_KEY=re_e2e RESEND_API_BASE=http://127.0.0.1:4999 LEAD_BRIEF_FROM=leads@example.com LEAD_BRIEF_TO=team@example.com
export GHL_WEBHOOK_SECRET=whsec_e2e_123 CRM_WEBHOOK_SECRET=whsec_e2e_123
export NOTIFY_FROM=leads@example.com NOTIFY_TO=team@example.com ALLOW_LOCAL_STORE=1 LEAD_ALLOW_MEMORY_STORE=1 NEXT_TELEMETRY_DISABLED=1

bash "$HERE/stop.sh" >/dev/null 2>&1 || true
rm -f /tmp/mock-requests.jsonl
SITES=()
for d in "${DIRS[@]}"; do
  s="$(site_of "$d")"; p="$(port_of "$s")"; SITES+=("$s")
  if [ "${E2E_BUILD:-0}" = "1" ]; then
    echo "building $s…"; (cd "$d" && NEXT_PUBLIC_OPENAI_PIXEL_ID=px_e2e ./node_modules/.bin/next build > "/tmp/e2e-build-$s.log" 2>&1) || { echo "build failed: /tmp/e2e-build-$s.log" >&2; exit 1; }
  fi
  (cd "$d" && nohup ./node_modules/.bin/next start -p "$p" > "/tmp/start-$s.log" 2>&1 < /dev/null &)
done
(cd "$HERE" && nohup node mock.mjs > /tmp/mock.log 2>&1 < /dev/null &)
(IFS=,; echo "${SITES[*]}") > /tmp/e2e-sites

for s in "${SITES[@]}"; do
  p="$(port_of "$s")"
  for _ in $(seq 1 60); do curl -sf -o /dev/null "http://127.0.0.1:$p/" && break; sleep 1; done
  curl -sf -o /dev/null "http://127.0.0.1:$p/" || { echo "$s did not start: /tmp/start-$s.log" >&2; exit 1; }
done
echo "started: $(cat /tmp/e2e-sites)"
