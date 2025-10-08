# Forge extra operator targets (optional include)

.PHONY: forge-index-ledger forge-verify-ledger forge-validate forge-witness forge-rollup forge-bff-v3

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
