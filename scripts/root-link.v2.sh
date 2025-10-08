#!/usr/bin/env bash
set -euo pipefail

RECEIPTS_DIR="${1:-receipts}"
EXT_ROOT_FILE="${2:-}"

if [[ -z "$EXT_ROOT_FILE" || ! -f "$EXT_ROOT_FILE" ]]; then
  echo "Usage: $0 <receipts_dir> <external_root_file>" >&2
  exit 1
fi

mkdir -p "$RECEIPTS_DIR/external-links"
CURR_HASH="$(grep '^root:' "$RECEIPTS_DIR/ROOT.txt" | cut -d ':' -f2-)"
EXT_HASH="$(grep '^root:' "$EXT_ROOT_FILE" | cut -d ':' -f2-)"

OUT="$RECEIPTS_DIR/external-links/$(date -u +%F).json"
printf '{"forgeRoot":"%s","externalRoot":"%s","linkedAt":"%s"}' \
  "$CURR_HASH" "$EXT_HASH" "$(date -u +%FT%TZ)" > "$OUT"

echo "Linked forgeRoot=$CURR_HASH externalRoot=$EXT_HASH"
