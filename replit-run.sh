#!/usr/bin/env bash
set -euo pipefail

# Start both services via repld if present; otherwise fall back to npm directly
if command -v repld >/dev/null 2>&1; then
  ( repld run bff ) & ( repld run frontend ) & wait
else
  echo "repld not found; starting dev servers with npm" >&2
  (cd workbench/bff && PORT=8787 npm i --no-audit --no-fund && PORT=8787 npm run dev) &
  (cd workbench/frontend && VITE_API_BASE="http://localhost:8787" npm i --no-audit --no-fund && npm run dev) &
  wait
fi
