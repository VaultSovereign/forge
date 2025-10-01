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
    (cd workbench/bff && PORT=8787 pnpm i && PORT=8787 pnpm run dev) &
    (cd workbench/frontend && VITE_API_BASE="http://localhost:8787" pnpm i && VITE_API_BASE="http://localhost:8787" pnpm run dev) &
  else
    (cd workbench/bff && PORT=8787 npm i && PORT=8787 npm run dev) &
    (cd workbench/frontend && VITE_API_BASE="http://localhost:8787" npm i && VITE_API_BASE="http://localhost:8787" npm run dev) &
  fi
  wait
fi
