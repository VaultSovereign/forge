#!/usr/bin/env bash
set -euo pipefail

MODEL="${1:-openai/gpt-5}"
BUNDLE="${2:-artifacts/audit/audit_bundle.json}"

if [[ ! -f "$BUNDLE" ]]; then
  echo "Bundle not found at $BUNDLE" >&2
  exit 2
fi

CONTENT="$(cat "$BUNDLE")"
# Safe cap to keep CLI usage friendly
MAX=200000
if (( ${#CONTENT} > MAX )); then CONTENT="${CONTENT:0:MAX}"; fi

MODEL="$MODEL" node dist/cli/index.js run codebase-audit \
  --args "$(jq -n --arg bc "$CONTENT" '{bundle_content:$bc}')"

