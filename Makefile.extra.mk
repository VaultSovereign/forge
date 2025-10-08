# Forge extra operator targets (optional include)

.PHONY: forge-index-ledger forge-verify-ledger forge-validate forge-witness forge-rollup forge-bff-v3 forge-run-stream

forge-index-ledger:
@node cli/vm.ts index-ledger ./ledger

forge-verify-ledger:
@node cli/vm.ts verify-ledger ./ledger

forge-validate:
@node scripts/validate-templates.mjs

forge-witness:
@node scripts/witness.v2.js

forge-rollup:
@bash scripts/rollup.v2.sh

forge-bff-v3:
@node workbench/bff/src/server.v3.ts

# Example:
#   make forge-run-stream KEYWORD=guardrails-check \\
#     ARGS='{"templateYaml":"id:x\\nversion:1.0.0\\nkeyword:test\\ninputs:[]\\nprompts:{system:"ok",user:"hi"}"}'
forge-run-stream:
@curl -sS "http://localhost:8787/v3/run/stream?keyword=$(KEYWORD)&args=$(ARGS)" -H 'accept: text/event-stream'
