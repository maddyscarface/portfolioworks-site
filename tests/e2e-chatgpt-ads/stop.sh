#!/usr/bin/env bash
# Stops the e2e servers (ports 3101–3104) and the mock (4999).
for p in 3101 3102 3103 3104 4999; do
  pid=$( (lsof -t -i :$p 2>/dev/null || fuser $p/tcp 2>/dev/null) | tr -s ' \n' ' ')
  [ -n "${pid// /}" ] && kill $pid 2>/dev/null
done
pkill -f "tests/e2e-chatgpt-ads/mock.mjs" 2>/dev/null; pkill -f "node mock.mjs" 2>/dev/null
exit 0
