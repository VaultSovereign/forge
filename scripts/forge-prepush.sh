#!/usr/bin/env bash
set -euo pipefail
ARTIFACTS_DIR=${ARTIFACTS_DIR:-artifacts/prepush}
GATES_JSON="$ARTIFACTS_DIR/gates.json"
mkdir -p "$ARTIFACTS_DIR"

# util: merge boolean flag into gates.json without re-running work
write_gate_flag() {
  local key="$1" val="$2"
  if command -v jq >/dev/null 2>&1 && [ -s "$GATES_JSON" ]; then
    tmp=$(mktemp)
    jq --arg k "$key" --argjson v "$val" '. + {($k):$v}' "$GATES_JSON" > "$tmp" && mv "$tmp" "$GATES_JSON"
  elif command -v jq >/dev/null 2>&1; then
    jq -n --arg k "$key" --argjson v "$val" '{($k):$v}' > "$GATES_JSON"
  else
    # minimal fallback
    printf '{ "%s": %s }\n' "$key" "$val" > "$GATES_JSON"
  fi
}

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

FAST="${FORGE_FAST:-0}"
SKIP_DOCTOR="${FORGE_SKIP_DOCTOR:-0}"
SKIP_REMOTE="${FORGE_SKIP_REMOTE_SCANS:-0}"

HAVE_PROVIDER=0
if [ -n "${OPENAI_API_KEY:-}" ] || [ -n "${OPENROUTER_API_KEY:-}" ] || [ -n "${OLLAMA_HOST:-}" ]; then
  HAVE_PROVIDER=1
fi

say() { printf "\033[1;34m[forge]\033[0m %s\n" "$*"; }
die() { printf "\033[1;31m[forge:fail]\033[0m %s\n" "$*" >&2; exit 1; }

# A) Grounding
say "Checking git cleanliness..."
git update-index -q --refresh
git diff --quiet || die "Unstaged changes present."
git diff --cached --quiet || die "Staged changes not committed."

# B) Toolchains
say "Validating toolchains..."
node -v >/dev/null || die "Node missing."
pnpm -v >/dev/null || die "pnpm missing."
python3 --version >/dev/null || die "python3 missing."

# C) Install & static checks
say "Installing deps (frozen lockfile)..."
pnpm install --frozen-lockfile >/dev/null

echo "[prepush] lint & format check (pnpm)"
if ! command -v pnpm >/dev/null 2>&1; then
  echo "[prepush] pnpm not found; enabling via corepack"
  corepack enable && corepack prepare pnpm@10.17.0 --activate
fi

say "Typecheck..."
pnpm run -s typecheck

say "Format check..."
pnpm format:check || { echo "[prepush] prettier check failed — run pnpm format"; exit 1; }
say "Lint..."
pnpm lint || { echo "[prepush] eslint failed — run pnpm lint:fix"; exit 1; }

say "Tests (record status to reuse later)..."
if pnpm test; then
  TEST_STATUS="pass"
  write_gate_flag tests_passed true
else
  TEST_STATUS="fail"
  write_gate_flag tests_passed false
  die "Tests failed."
fi

# D) Build & doctor
say "Build..."
pnpm run -s build

say "Doctor..."
if [ "$SKIP_DOCTOR" = "1" ]; then
  say "Skipping doctor check because FORGE_SKIP_DOCTOR=1."
else
  node dist/cli/index.js doctor || die "vm doctor failed."
fi

# E) Security gates
TMPDIR="${TMPDIR:-/tmp}"
SECF="$TMPDIR/pre_secrets.json"
CHGF="$TMPDIR/pre_changed.json"
SECO="$TMPDIR/secrets_out.json"
REVO="$TMPDIR/review_out.json"

say "Prescans (secrets + changed files)..."
if command -v ts-node >/dev/null 2>&1; then
  ts-node scripts/pre_scan/secrets_scan.ts >"$SECF" || true
  ts-node scripts/pre_scan/collect_changed_files.ts >"$CHGF" || true
else
  say "ts-node not found; generating empty prescan manifests."
  echo '{}' >"$SECF"
  echo '{}' >"$CHGF"
fi

CRIT=0
HIGH=0

if [ "$HAVE_PROVIDER" = "1" ]; then
  say "Secrets audit (critical==0)..."
  node dist/cli/index.js run cyber-secrets-audit     --args "$(jq -nc '{repo_context:"prepush", files_index:(.files), findings_raw:(input), changed_only:(.changed_only)}' "$CHGF" "$SECF")"     >"$SECO" || die "Secrets audit run failed."
  CRIT=$(jq '.result.summary.critical // 0' "$SECO")
  [ "$CRIT" -eq 0 ] || die "Critical secrets detected: $CRIT"

  say "Code security review (high==0)..."
  node dist/cli/index.js run cyber-code-security-reviewer     --args "$(jq -nc '{repo_context:"prepush", diffs_or_files:(.files), prescan:{secrets: input}}' "$CHGF" "$SECF")"     >"$REVO" || die "Code review run failed."
  HIGH=$(jq '.result.summary.high // 0' "$REVO")
  [ "$HIGH" -eq 0 ] || die "High-severity code issues: $HIGH"
else
  if [ "$SKIP_REMOTE" = "1" ]; then
    say "Skipping remote security scans because no provider is configured."
  else
    die "No model provider configured. Set OLLAMA_HOST, OPENROUTER_API_KEY, or OPENAI_API_KEY, or export FORGE_SKIP_REMOTE_SCANS=1."
  fi
fi

printf "\n\033[1;36m[forge:summary]\033[0m secrets.critical=%s, review.high=%s\n" "$CRIT" "$HIGH"

# F) Supply-chain (optional in FAST)
if [ "$FAST" != "1" ]; then
  say "SBOM..."
  pnpm run -s sbom || true

  if [ "$HAVE_PROVIDER" = "1" ]; then
    say "Container advisory..."
    DOCKF="$TMPDIR/pre_docker.json"
    if command -v ts-node >/dev/null 2>&1; then
      ts-node scripts/pre_scan/docker_scan.ts >"$DOCKF" || true
    else
      echo '{}' >"$DOCKF"
    fi
    node dist/cli/index.js run cyber-container-security-scanner \
      --args @"$DOCKF" >"$TMPDIR/container_out.json" || true
  else
    if [ "$SKIP_REMOTE" = "1" ]; then
      say "Skipping container advisory because no provider is configured."
    else
      say "Container advisory skipped: configure a provider or export FORGE_SKIP_REMOTE_SCANS=1."
    fi
  fi
else
  say "FAST mode enabled: skipping SBOM and container advisory."
fi

# G) Compliance snapshot (advisory)
if [ "$FAST" != "1" ]; then
  if [ "$HAVE_PROVIDER" = "1" ]; then
    say "Compliance gap snapshot..." # reuse earlier results, do not re-run heavy work
    # tests_passed: reuse the value we just computed
    if [ "${TEST_STATUS:-fail}" = "pass" ]; then
      tests_passed=true
    else
      tests_passed=false
    fi
    # secrets_gate_ran: true when a secrets audit artifact exists from this run
    SECRETS_AUDIT_PATH="$ARTIFACTS_DIR/secrets_audit.json"
    if [ -s "$SECRETS_AUDIT_PATH" ]; then
      secrets_gate_ran="true"
    else
      secrets_gate_ran="false"
    fi

    # Build compliance snapshot JSON (include counts if available)
    CODE_REVIEW_PATH="$ARTIFACTS_DIR/code_review.json"
    SECRETS_CRIT="null"
    REVIEW_HIGH="null"
    if command -v jq >/dev/null 2>&1; then
      [ -s "$SECRETS_AUDIT_PATH" ] && SECRETS_CRIT="$(jq -r '.result.summary.critical // 0' "$SECRETS_AUDIT_PATH")"
      [ -s "$CODE_REVIEW_PATH" ] && REVIEW_HIGH="$(jq -r '.result.summary.high // 0' "$CODE_REVIEW_PATH")"
    fi
    jq -nc --argjson tests_passed "$tests_passed" --argjson secrets_gate_ran "$secrets_gate_ran" --argjson secrets_critical "$SECRETS_CRIT" --argjson review_high "$REVIEW_HIGH" '{ current_controls: { ci:{ tests_passed: $tests_passed, secrets_gate_ran: $secrets_gate_ran, secrets_critical: $secrets_critical, review_high: $review_high }, ledger:{ hashing:"sha256", signature:"ed25519?" } }, target_frameworks:["NIST 800-53","OWASP ASVS"] }' > "$TMPDIR/gaps.json"
    node dist/cli/index.js run cyber-compliance-gap-analyzer --args @"$TMPDIR/gaps.json" >"$TMPDIR/gaps_out.json" || true
    
    # Executive summary via Research Analyst (advisory)
    say "Executive summary (research-analyst)..."
    jq -nc \
      --arg tp "Pre-push CI security summary" \
      --arg seco "$SECO" \
      --arg revo "$REVO" \
      --arg gaps "$TMPDIR/gaps_out.json" \
      '{topic:$tp, sources:["secrets_audit:"+$seco, "code_review:"+$revo, "compliance_gaps:"+$gaps], scope:"executive"}' \
      > "$TMPDIR/analyst_args.json"
    node dist/cli/index.js run operations-research-analyst --args @"$TMPDIR/analyst_args.json" >"$TMPDIR/exec_summary_out.json" || true
  else
    if [ "$SKIP_REMOTE" = "1" ]; then
      say "Skipping compliance snapshot because no provider is configured."
    else
      say "Compliance snapshot skipped: configure a provider or export FORGE_SKIP_REMOTE_SCANS=1."
    fi
  fi
fi

# H) Artifacts
say "Archiving artifacts..."
mkdir -p artifacts/prepush
cp -f "$TMPDIR"/*_out.json artifacts/prepush/ 2>/dev/null || true
[ -f sbom.json ] && cp -f sbom.json artifacts/prepush/
if [ -f "$TMPDIR/exec_summary_out.json" ]; then
  cp -f "$TMPDIR/exec_summary_out.json" artifacts/prepush/executive-summary.json || true
fi

say "Pre-push checks passed."
