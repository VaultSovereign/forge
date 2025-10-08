#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${1:-.}"
RECEIPTS_DIR="$ROOT_DIR/receipts"
DAY="$(date -u +%F)"

mkdir -p "$RECEIPTS_DIR"

if [[ ! -f "$RECEIPTS_DIR/ROOT.txt" ]]; then
  echo "ROOT.txt not found; run scripts/witness.v2.js first" >&2
  exit 1
fi

mkdir -p "$RECEIPTS_DIR/roots"
cp "$RECEIPTS_DIR/ROOT.txt" "$RECEIPTS_DIR/roots/ROOT-$DAY.txt" 2>/dev/null || true
mkdir -p "$RECEIPTS_DIR/links"

PREV="$RECEIPTS_DIR/LAST_ROOT.txt"
CURR="$RECEIPTS_DIR/ROOT.txt"

if [[ -f "$PREV" ]]; then
  PREV_HASH="$(grep '^root:' "$PREV" | cut -d ':' -f2-)"
else
  PREV_HASH=""
fi
CURR_HASH="$(grep '^root:' "$CURR" | cut -d ':' -f2-)"

LINK_PATH="$RECEIPTS_DIR/links/${DAY}.json"
printf '{"prev":"%s","curr":"%s","linkedAt":"%s"}' \
  "$PREV_HASH" "$CURR_HASH" "$(date -u +%FT%TZ)" > "$LINK_PATH"

echo "Linked $PREV_HASH -> $CURR_HASH"
