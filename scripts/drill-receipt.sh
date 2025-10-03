#!/usr/bin/env bash
set -euo pipefail

# Drill Receipt Emitter
# Usage: bash scripts/drill-receipt.sh guardian_deploy|guardian_destroy

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <kind>" >&2
  exit 1
fi

KIND="$1"
TS=$(date -u +"%Y%m%dT%H%M%SZ")
DAY=$(date -u +%F)
DIR="artifacts/drills"
ROOTS_DIR="artifacts/roots"
REGION="${REGION:-europe-west3}"
mkdir -p "$DIR" "$ROOTS_DIR"

OUT="$DIR/${KIND}-${TS}.json"

jq -n \
  --arg ts "$TS" \
  --arg kind "$KIND" \
  --arg region "$REGION" \
  --arg actor "${USER:-unknown}" \
  --arg sha "${GITHUB_SHA:-$(git rev-parse --short HEAD 2>/dev/null || echo unknown)}" \
  '{kind:$kind, ts:$ts, region:$region, actor:$actor, git:{sha:$sha}}' > "$OUT"

echo "🧾 Drill receipt: $OUT"

# Daily Merkle (BLAKE3 preferred)
if command -v b3sum >/dev/null 2>&1; then
  mapfile -t FILES < <(find "$DIR" -maxdepth 1 -type f -name "${KIND}-$(date -u +%Y%m%d)*.json" | sort)
  if [[ ${#FILES[@]} -gt 0 ]]; then
    HASHES=$(printf '%s\n' "${FILES[@]}" | xargs -I{} b3sum "{}" | awk '{print $1}')
    ROOT=$(printf '%s' "$HASHES" | b3sum | awk '{print $1}')
    echo "{\"day\":\"$DAY\",\"kind\":\"$KIND\",\"root\":\"$ROOT\"}" > "$ROOTS_DIR/root-$DAY.json"
    echo "🌳 Daily root (BLAKE3): $ROOTS_DIR/root-$DAY.json"
  fi
fi
