#!/usr/bin/env bash
set -euo pipefail

ORE_FILE="${1:-unforged_forge_genesis/ore/0004_template_evolution.json}"
FORGE_DIR="${2:-unforged_forge_genesis}"
TS="${3:-}"

if [ ! -f "$ORE_FILE" ]; then
  echo "[forge-mint-ore] missing ore file: $ORE_FILE" >&2
  exit 1
fi
if [ ! -d "$FORGE_DIR" ]; then
  echo "[forge-mint-ore] missing forge dir: $FORGE_DIR" >&2
  exit 1
fi

ARGS=("$FORGE_DIR/scripts/forge.py" "$ORE_FILE" "--base-dir" "$FORGE_DIR")
if [ -n "$TS" ]; then
  ARGS+=("--timestamp" "$TS")
fi

python3 "${ARGS[@]}"
