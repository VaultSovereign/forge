# Proof Gate helpers (include in main Makefile if desired)

.PHONY: forge-proof forge-bff-8787 forge-proof-receipts

forge-bff-8787:
	@node --loader ts-node/esm workbench/bff/src/server.port8787.ts

# Example:
#  make -f Makefile.proof.mk forge-proof KEYWORD=guardrails-check ARGS='{"templateYaml":"..."}'
forge-proof:
	@PROOF_KEYWORD="$(KEYWORD)" PROOF_ARGS='$(ARGS)' node scripts/proof-smoke.mjs

forge-proof-receipts:
	@node scripts/witness.v2.js
	@bash scripts/rollup.v2.sh
