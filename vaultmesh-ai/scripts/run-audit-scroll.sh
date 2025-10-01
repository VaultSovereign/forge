#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OUT_DIR="artifacts/audit"
mkdir -p "$OUT_DIR"

BUNDLE_PATH=${AUDIT_BUNDLE_PATH:-artifacts/audit/audit_bundle.json}
USE_DOTENV=${AUDIT_USE_DOTENV:-1}

CMD=(node dist/cli/index.js run codebase.audit.v1 --args "{\"bundle_path\":\"$BUNDLE_PATH\"}")
if [ "$USE_DOTENV" = "1" ]; then
  CMD=(npx dotenv -- "${CMD[@]}")
fi

set +e
OUTPUT="$(${CMD[@]} 2>&1)"
STATUS=$?
set -e
printf '%s\n' "$OUTPUT"

if [ $STATUS -ne 0 ]; then
  exit $STATUS
fi

export AUDIT_RAW_OUTPUT="$OUTPUT"
JSON=$(
python3 - <<'PY'
import json, os, sys

text = os.environ.get('AUDIT_RAW_OUTPUT', '')
start = text.find('{')
if start == -1:
    sys.exit(1)
content = text[start:]
depth = 0
end = 0
for i, ch in enumerate(content):
    if ch == '{':
        depth += 1
    elif ch == '}':
        depth -= 1
        if depth == 0:
            end = i + 1
            break
snippet = content[:end] if end else content
obj = json.loads(snippet)
print(json.dumps(obj, indent=2))
PY
) || { echo "[audit] failed to extract JSON output"; exit 1; }
unset AUDIT_RAW_OUTPUT

commit=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)
if [ "$commit" != "unknown" ] && command -v jq >/dev/null 2>&1; then
  JSON=$(printf '%s\n' "$JSON" | jq --arg c "$commit" '
    .meta.repo_hash = $c
    | ( .result.meta |= (if . then . else {} end) | .result.meta.repo_hash = $c )
  ' 2>/dev/null || printf '%s\n' "$JSON")
fi

mkdir -p "$OUT_DIR"
base_file="$OUT_DIR/audit_scroll.json"
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
stamp_file="$OUT_DIR/audit_scroll-$timestamp.json"

printf '%s\n' "$JSON" | tee "$base_file" > "$stamp_file"
verdict=$(printf '%s\n' "$JSON" | jq -r '.verdict // .result.verdict // "unknown"' 2>/dev/null || echo unknown)
echo "[audit] scroll saved to $base_file and $stamp_file"
echo "[audit] verdict: $verdict"

if [ -x "scripts/forge-mint-audit.sh" ]; then
  echo "[audit] anchoring scroll in forge archive…"
  forge_log="$OUT_DIR/forge_mint.log"
  if bash scripts/forge-mint-audit.sh "$base_file" "unforged_forge_genesis" >>"$forge_log" 2>&1; then
    latest=$(ls -1t unforged_forge_genesis/archive/artifact-*.json 2>/dev/null | head -n 1)
    if [ -n "$latest" ] && [ -x "scripts/merkle_proof.js" ]; then
      artifact_id=$(basename "$latest" .json)
      if node scripts/merkle_proof.js "$artifact_id" "unforged_forge_genesis" > "$OUT_DIR/proof_bundle.json" 2>"$OUT_DIR/proof_bundle.log"; then
        echo "[audit] proof bundle → $OUT_DIR/proof_bundle.json"
        if [ -x "scripts/verify-proof.js" ]; then
          verify_output=$(node scripts/verify-proof.js "$OUT_DIR/proof_bundle.json" 2>&1)
          verify_status=$?
          printf '%s\n' "$verify_output" > "$OUT_DIR/proof_verification.json"
          if [ $verify_status -eq 0 ]; then
            echo "[audit] proof verification passed"
          else
            echo "[audit] proof verification failed (see $OUT_DIR/proof_verification.json)" >&2
          fi
        fi
      else
        echo "[audit] failed to build proof bundle (see $OUT_DIR/proof_bundle.log)" >&2
      fi
    else
      echo "[audit] no artifact found after mint; skipping proof generation" >&2
    fi
  else
    echo "[audit] forge mint failed (see $forge_log)" >&2
  fi
else
  echo "[audit] forge-mint-audit.sh not found; skipping anchoring"
fi

case "$verdict" in
  production-ready|pilot-ready|research-only|unknown)
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
