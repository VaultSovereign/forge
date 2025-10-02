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

echo "== RBAC asserts (if dev signer available) =="
set +e
JWKS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/dev/jwks.json")
set -e
if [ "${JWKS_CODE}" = "200" ]; then
  echo "→ mint auditor token"
  AUD_TOKEN=$(curl -fsS -X POST -H 'content-type: application/json' -d '{"sub":"smoke-aud","roles":["auditor"]}' \
    "${BASE}/v1/dev/token" | jq -r .token)
  if [ -z "${AUD_TOKEN}" ] || [ "${AUD_TOKEN}" = "null" ]; then
    echo "failed to mint auditor token"; exit 1;
  fi
  echo "→ /v1/api/templates should be 200 for auditor"
  T_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer ${AUD_TOKEN}" "${BASE}/v1/api/templates")
  if [ "$T_CODE" != "200" ]; then echo "expected 200, got $T_CODE"; exit 1; fi
  echo "→ /v1/api/execute should be 403 for auditor"
  E_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer ${AUD_TOKEN}" -H 'content-type: application/json' \
    -d '{"templateId":"demo.echo","args":{"msg":"hello"}}' "${BASE}/v1/api/execute")
  if [ "$E_CODE" != "403" ]; then echo "expected 403, got $E_CODE"; exit 1; fi
else
  echo "(dev signer not enabled; skipping RBAC asserts)"
fi

echo "DONE"
