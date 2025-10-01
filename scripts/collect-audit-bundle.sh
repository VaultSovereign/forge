#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OUT_DIR="artifacts/audit"
mkdir -p "$OUT_DIR"

commit="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
git ls-files > "$OUT_DIR/files.txt" || true

# Module tree (depth 2)
find . -maxdepth 2 -type d \
  -not -path "*/.git*" -not -path "*/node_modules*" \
  | sed 's|^\./||' > "$OUT_DIR/modules.txt"

# PNPM deps (best-effort)
pnpm -s list --depth=1 --json > "$OUT_DIR/deps.json" || echo "[]" > "$OUT_DIR/deps.json"

# CI workflow references (best-effort)
grep -R --line-number --no-messages "on:" .github/workflows > "$OUT_DIR/ci_index.txt" || true

# Vitest & Pytest summaries (best-effort, never fail)
pnpm -s test --reporter=json --coverage --passWithNoTests \
  > "$OUT_DIR/vitest.json" 2>/dev/null || echo '{}' > "$OUT_DIR/vitest.json"
pytest -q -rA --maxfail=1 \
  > "$OUT_DIR/pytest.txt" 2>/dev/null || echo 'pytest-not-run' > "$OUT_DIR/pytest.txt"

# Workbench health (if reachable)
curl -fsS http://localhost:8787/v1/api/health > "$OUT_DIR/workbench.health.json" 2>/dev/null || echo '{}' > "$OUT_DIR/workbench.health.json"

# Bundle into a single JSON
jq -n \
  --arg commit "$commit" \
  --rawfile files "$OUT_DIR/files.txt" \
  --rawfile modules "$OUT_DIR/modules.txt" \
  --slurpfile deps "$OUT_DIR/deps.json" \
  --rawfile ci "$OUT_DIR/ci_index.txt" \
  --rawfile vitest "$OUT_DIR/vitest.json" \
  --rawfile pytest "$OUT_DIR/pytest.txt" \
  --rawfile wb "$OUT_DIR/workbench.health.json" \
'{
  commit:$commit,
  files: ($files|split("\n")|map(select(length>0))),
  modules: ($modules|split("\n")|map(select(length>0))),
  deps: ( ($deps|length>0) and $deps[0] or [] ),
  ci_index: $ci,
  vitest: (try ($vitest|fromjson) catch {}),
  pytest: $pytest,
  workbench: (try ($wb|fromjson) catch {})
}' > "$OUT_DIR/audit_bundle.json"

echo "[audit] bundle → $OUT_DIR/audit_bundle.json"
