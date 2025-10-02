#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ART_DIR="${ART_DIR:-artifacts/demo}"
mkdir -p "$ART_DIR"

# Optional env override (your Pages URL)
DECK_URL="${DECK_URL:-https://VaultSovereign.github.io/forge/}"

echo "[demo] Build…"
pnpm -s build

echo "[demo] Doctor (skip provider reachability)…"
# best-effort; ignore failures so demo still runs in airgapped envs
node dist/cli/index.js doctor --json --skip-provider >/dev/null 2>&1 || true

echo "[demo] Run DORA ICT Risk…"
npx dotenv -- node dist/cli/index.js run dora.ict_risk_framework.v1 \
  --args @examples/inputs/ict_risk.acme.json \
  > "$ART_DIR/ict_risk.report.json"

echo "[demo] Run DORA TPRM…"
npx dotenv -- node dist/cli/index.js run dora.tprm.v1 \
  --args @examples/inputs/tprm.acme.json \
  > "$ART_DIR/tprm.report.json"

# Summaries (advisory)
if command -v jq >/dev/null 2>&1; then
  echo "[demo] ICT Risk summary:"
  jq '{controls: (.result.controls|length), first_control: .result.controls[0]}' "$ART_DIR/ict_risk.report.json" || true
  echo "[demo] TPRM summary (if fields present):"
  jq '{vendor: .result.vendor_name, acceptance: .result.acceptance, score: .result.risk_score}' "$ART_DIR/tprm.report.json" || true
fi

# Try to open sales deck (+ optionally local reports) cross‑platform
open_url() {
  local url="$1"
  if command -v xdg-open >/dev/null 2>&1; then xdg-open "$url" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then open "$url" >/dev/null 2>&1 || true
  else printf '%s\n' "$url"
  fi
}

echo
echo "[demo] Artifacts:"
echo " - $ART_DIR/ict_risk.report.json"
echo " - $ART_DIR/tprm.report.json"

echo
echo "[demo] Opening sales deck: $DECK_URL"
open_url "$DECK_URL" || true
echo "[demo] Done."
