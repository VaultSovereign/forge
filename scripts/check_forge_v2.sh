#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Checking Forge v2 integration..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [ -d "${REPO_ROOT}/forge" ] && [ -f "${REPO_ROOT}/forge/Forgefile.yaml" ]; then
  PROJECT_DIR="${REPO_ROOT}/forge"
elif [ -f "${REPO_ROOT}/Forgefile.yaml" ] && [ -d "${REPO_ROOT}/src/forge_v2" ]; then
  PROJECT_DIR="${REPO_ROOT}"
else
  echo "❌ Unable to locate Forge v2 project (missing Forgefile.yaml)"
  exit 1
fi

cd "${PROJECT_DIR}"

if ! command -v uv >/dev/null 2>&1; then
  echo "ℹ️  'uv' CLI not found; attempting to install via pip"
  python3 -m pip install --upgrade pip >/dev/null
  python3 -m pip install --quiet uv
fi

# Ensure dependencies are available before running commands.
if [ "${FORGE_V2_SKIP_SYNC:-0}" != "1" ]; then
  uv sync >/dev/null
fi

cleanup() {
  if [ -n "${PID:-}" ] && kill -0 "${PID}" >/dev/null 2>&1; then
    kill "${PID}" || true
    wait "${PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT

# Start server in background
uv run uvicorn forge_v2.api:app --host 0.0.0.0 --port 8787 >/tmp/forge_v2_uvicorn.log 2>&1 &
PID=$!

# Give the server a moment to boot
sleep 3

# Run a ritual
RESP=$(uv run forge-run daily-anchor)
echo "Ritual output:"
echo "$RESP"

# Check receipts
DATE=$(date -u +%Y-%m-%d)
DIR="reality_ledger/forge/${DATE}"
if [ -d "$DIR" ] && [ -n "$(ls -A "$DIR" 2>/dev/null)" ]; then
  echo "✅ Receipts present in $DIR"
else
  echo "❌ No receipts in $DIR"
  exit 1
fi

# Tail events (best-effort)
echo "Events log (first few):"
curl -NsS http://localhost:8787/api/forge/events --max-time 2 || true

# Metrics head
echo "Metrics snippet:"
curl -s http://localhost:8787/metrics | head -n 10

echo "🔖 Forge v2 check passed"
