#!/usr/bin/env bash
# Monthly shard rotation for Reality Ledger
# Archives events-YYYY-MM-*.{jsonl,idx} into reality_ledger/archive/events-YYYY-MM.tgz
# Usage:
#   bash scripts/ledger-rotate.sh                 # rotate previous month
#   bash scripts/ledger-rotate.sh --month 2025-09 # rotate specific month
#   bash scripts/ledger-rotate.sh --month 2025-09 --keep  # archive without deleting sources
#   bash scripts/ledger-rotate.sh --dry-run

set -euo pipefail

MONTH=""
KEEP=0
DRYRUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --month)
      MONTH="${2:-}"
      shift 2
      ;;
    --keep)
      KEEP=1
      shift
      ;;
    --dry-run)
      DRYRUN=1
      shift
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]:-$0}")" && pwd -P)"
ROOT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd -P)"
LEDGER_DIR="$ROOT_DIR/reality_ledger"
ARCHIVE_DIR="$LEDGER_DIR/archive"
mkdir -p "$ARCHIVE_DIR"

if [[ -z "$MONTH" ]]; then
  if command -v gdate >/dev/null 2>&1; then
    MONTH="$(gdate -u -d '1 month ago' +%Y-%m)"
  else
    MONTH="$(date -u -v-1m +%Y-%m 2>/dev/null || date -u -d '1 month ago' +%Y-%m)"
  fi
fi

JSONL_GLOB="$LEDGER_DIR/events-$MONTH-*.jsonl"
IDX_GLOB="$LEDGER_DIR/events-$MONTH-*.idx"

shopt -s nullglob
files=( $JSONL_GLOB $IDX_GLOB )
shopt -u nullglob

if [[ ${#files[@]} -eq 0 ]]; then
  echo "🛈 No shards found for $MONTH in $LEDGER_DIR"
  exit 0
fi

ARCHIVE_PATH="$ARCHIVE_DIR/events-$MONTH.tgz"

echo "🜄 Rotating month: $MONTH"
print_files() {
  for f in "$@"; do
    echo "  - $(basename "$f")"
  done
}

echo "• Files: ${#files[@]}"
print_files "${files[@]}"
echo "• Archive: $(basename "$ARCHIVE_PATH")"

if [[ $DRYRUN -eq 1 ]]; then
  echo "⚠️  DRY-RUN: not writing archive or deleting files"
  exit 0
fi

( cd "$LEDGER_DIR" && tar -czf "$ARCHIVE_PATH" $(printf '%s\n' "${files[@]}" | xargs -n1 -I{} basename "{}") )
echo "✅ Wrote $ARCHIVE_PATH"

if [[ $KEEP -eq 0 ]]; then
  rm -f "${files[@]}"
  echo "🧹 Removed ${#files[@]} source shard files"
else
  echo "🗄️  --keep set: source shard files preserved"
fi
