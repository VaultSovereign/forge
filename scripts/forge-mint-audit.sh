#!/usr/bin/env bash
set -euo pipefail

SCROLL="${1:-artifacts/audit/audit_scroll.json}"
BASE="${2:-unforged_forge_genesis}"
TS="${3:-}"

if [ ! -s "$SCROLL" ]; then
  echo "[forge-mint] missing scroll: $SCROLL" >&2
  exit 1
fi
if [ ! -d "$BASE" ]; then
  echo "[forge-mint] missing forge base dir: $BASE" >&2
  exit 1
fi

ARGS=("$BASE/scripts/forge.py" "$SCROLL" "--base-dir" "$BASE")
if [ -n "$TS" ]; then
  ARGS+=("--timestamp" "$TS")
fi

echo "[forge-mint] minting artifact from: $SCROLL"
python3 "${ARGS[@]}"
echo "[forge-mint] done. archive and checkpoint updated in $BASE/"
