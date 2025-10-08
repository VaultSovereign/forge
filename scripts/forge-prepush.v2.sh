#!/usr/bin/env bash
set -euo pipefail

echo "== Forge Prepush v2 =="

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found; please install pnpm (corepack enable)" >&2
  exit 1
fi

echo "-- Typecheck & tests --"
pnpm -s build || true
pnpm -s test || true

echo "-- Template validation --"
pnpm -s add -D ajv yaml >/dev/null 2>&1 || true
node scripts/validate-templates.mjs || {
  echo "Template validation failed." >&2
  exit 2
}

echo "-- Security scans (advisory) --"
pnpm -s audit || true
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks detect --no-banner || true
fi

echo "-- Receipts --"
node scripts/witness.v2.js
bash scripts/rollup.v2.sh

echo "Prepush v2 complete."
