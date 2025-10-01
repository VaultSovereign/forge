#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8787}"
BASE="http://127.0.0.1:${PORT}"
AUTH_HEADER_VALUE="${AUTH_HEADER:-}"

h() {
  if [ -n "${AUTH_HEADER_VALUE}" ]; then
    curl -fsS -H "${AUTH_HEADER_VALUE}" "$1"
  else
    curl -fsS "$1"
  fi
}

echo "== Health =="
h "${BASE}/v1/health" | jq . || true

echo "== Templates =="
h "${BASE}/v1/api/templates" | jq . || true

echo "== Template count (if present) =="
set +e
h "${BASE}/v1/api/templates/count" | jq . 2>/dev/null || echo "(count endpoint not present)"
set -e

echo "== Ledger (first 5) =="
h "${BASE}/v1/api/ledger/events?limit=5" | jq . || true

echo "== SSE tick (1 event) =="
python3 - <<'PY'
import sys, time, urllib.request, os
port = os.environ.get("PORT","8787")
req  = urllib.request.Request(f"http://127.0.0.1:{port}/v1/tick/stream")
with urllib.request.urlopen(req, timeout=6) as r:
    start=time.time()
    seen=False
    while time.time()-start < 5:
        line=r.readline().decode()
        if line.startswith("event: tick"):
            print("tick: ok"); seen=True; break
    if not seen:
        print("tick: MISS"); sys.exit(1)
PY

echo "DONE"
