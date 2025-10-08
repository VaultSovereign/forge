# Forge Operations Runbook (Next)

This runbook documents the day-to-day operator flows now that templates, provider fallbacks, and receipts operate under Phase 3 guardrails.

## Environment setup

Set at least one of the following environment variables before executing templates:

```bash
export OPENAI_API_KEY=...            # Hosted OpenAI
export OPENROUTER_API_KEY=...        # OpenRouter marketplace
export OLLAMA_HOST=http://127.0.0.1:11434  # Local inference
```

## Daily ritual

### 1. Validate ritual templates
```bash
node scripts/validate-templates.mjs
```

### 2. Execute a template by keyword
Start the lightweight BFF:
```bash
node workbench/bff/src/server.v3.ts
```
Then trigger an execution:
```bash
curl -s -X POST localhost:3002/v2/templates/exec \
  -H 'content-type: application/json' \
  -d '{"keyword":"guardrails-check","args":{"templateYaml":"id:x\nversion:1.0.0\nkeyword:test\ninputs:[]\nprompts:{system:\"ok\",user:\"ok\"}"}}' | jq .
```

### 3. Index and verify the ledger
```bash
node cli/vm.ts index-ledger ./ledger
node cli/vm.ts verify-ledger ./ledger
```

### 4. Generate receipts and daily roots
```bash
node scripts/witness.v2.js
bash scripts/rollup.v2.sh
```

### 5. Link Forge roots to VaultMesh core
```bash
bash scripts/root-link.v2.sh receipts /path/to/CORE_ROOT.txt
```

## CI guidance

- Add `templates-validate.yml` to enforce schema validation on pull requests.
- Keep `security-gates.yml` enabled for advisory scans (gitleaks, Trivy).
- Upload `receipts/**` artifacts on every CI run for provenance.

## Troubleshooting

- **Provider fallback loops**: check logs tagged `provider-manager` to confirm circuit breaker state.
- **Template lookup failures**: ensure the YAML file lives under `catalog/` and includes a `keyword` field.
- **SSE hangs**: use the SSE helpers in `workbench/bff/sse.ts` and the v2/v3 servers to guarantee keep-alives.
