.PHONY: forge-prepush install-git-hooks proposal-verify

FORGE_FAST ?= 0

forge-prepush:
	@echo "[forge] FAST=$(FORGE_FAST)"
	@FORGE_FAST=$(FORGE_FAST) bash scripts/forge-prepush.sh

install-git-hooks:
	@mkdir -p .git/hooks
	@printf '%s\n' '#!/usr/bin/env bash' 'FORGE_FAST=$${FORGE_FAST:-0} scripts/forge-prepush.sh' > .git/hooks/pre-push
	@chmod +x .git/hooks/pre-push
	@echo "[forge] pre-push hook installed (FAST=$${FORGE_FAST:-0})"

proposal-verify:
	@python3 unforged_forge_genesis/scripts/proposal_verify.py \
		--proposal unforged_forge_genesis/ore/0002_protocol_evolution_template.json \
		--genesis unforged_forge_genesis/genesis.json

.PHONY: demo-compliance demo-clean

demo-compliance:
	@bash scripts/demo-compliance.sh

demo-clean:
	rm -rf artifacts/demo

.PHONY: audit-bundle audit-run

audit-bundle:
	@bash scripts/collect-audit-bundle.sh

audit-run: audit-bundle
	@bash scripts/run-audit-scroll.sh

.PHONY: evolution-index

evolution-index:
	@node scripts/template_index_build.mjs
	@ls -l artifacts/evolution/template_index.json

.PHONY: evolution-journal

evolution-journal:
	@node scripts/journal_append.mjs
	@tail -n 5 artifacts/evolution/template_journal.jsonl || true
