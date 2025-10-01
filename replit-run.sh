#!/usr/bin/env bash
set -euo pipefail

# Ensure corepack; if network is blocked, we still try to proceed when pnpm already exists.
corepack enable || true

# Start both services via repld if present; otherwise fall back to local dev commands.
if command -v repld >/dev/null 2>&1; then
  ( repld run bff ) & ( repld run frontend ) & wait
else
  echo "repld not found; starting dev servers directly (non-Replit)" >&2
  # Kick off BFF then frontend. Use pnpm if available, else npm.
  if command -v pnpm >/dev/null 2>&1; then
    (cd workbench/bff && pnpm i && pnpm run dev) &
    (cd workbench/frontend && pnpm i && pnpm run dev) &
  else
    (cd workbench/bff && npm i && npm run dev) &
    (cd workbench/frontend && npm i && npm run dev) &
  fi
  wait
fi
