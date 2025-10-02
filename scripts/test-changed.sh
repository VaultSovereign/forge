#!/usr/bin/env bash
set -euo pipefail

# Determine base ref (PR base or default origin/main)
BASE="${BASE_REF:-origin/main}"

# Find changed files relative to BASE, include common source/test trees
CHANGED=$(git diff --name-only "$BASE"...HEAD -- \
  'agent/**/*' \
  'agents/**/*' \
  'cli/**/*' \
  'dispatcher/**/*' \
  'mcp/**/*' \
  'reality_ledger/**/*' \
  'tools/**/*' \
  'workbench/**/*' \
  'tests/**/*' || true)

if [ -z "$CHANGED" ]; then
  echo "No relevant changes detected; exiting zero."; exit 0;
fi

echo "Changed files against $BASE:" >&2
echo "$CHANGED" >&2

# Prefer Vitest 'related' mode to map sources to tests
pnpm vitest related $CHANGED
