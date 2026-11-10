#!/usr/bin/env bash
# One command: build (pixel id px_e2e) → start site(s) + mock → run e2e → stop.
#   npm run e2e:chatgpt-ads                     # this project only
#   E2E_ROOT=/folder/with/all/four npm run e2e:chatgpt-ads   # all four sites, cross-site checks
# First time only: npx playwright install chromium   (or set PW_CHANNEL=chrome to use installed Chrome)
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_BUILD="${E2E_BUILD:-1}" bash "$HERE/start.sh" || { bash "$HERE/stop.sh"; exit 1; }
SITES="${SITES:-$(cat /tmp/e2e-sites)}" node "$HERE/e2e.mjs"; code=$?
bash "$HERE/stop.sh"
exit $code
