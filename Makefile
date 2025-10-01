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

# --- VaultMesh Portal helpers ---

## Compile the Agent bundle (stub → agent flip)
agent:
	npm run build:agents

## Start both services (BFF + Frontend) for dev
dev: dev:bff dev:web
dev:bff:
	cd workbench/bff && npm i --no-audit --no-fund && npm run dev
dev:web:
	cd workbench/frontend && npm i --no-audit --no-fund && npm run dev

## Production-style builds (optional)
build: build:bff build:web
build:bff:
	cd workbench/bff && npm run build
build:web:
	cd workbench/frontend && npm run build

## Run tests (if present)
test:
	npm test || true

## Clean typical build outputs
clean:
	rm -rf workbench/bff/dist workbench/frontend/dist agents/build

.PHONY: curl:mode smoke:guardian

curl:mode:
	@curl -s http://localhost:8787/v1/guardian/mode | jq .

smoke:guardian: build:bff
	@node -e "fetch('http://localhost:8787/v1/guardian/mode').then(r=>r.json()).then(j=>{const m=j.mode;const ok=['stub','agent','unknown'].includes(m);console.log('guardian mode:', m); if(!ok) process.exit(1);}).catch(e=>{console.error(e);process.exit(1)})"

.PHONY: curl:mode:head
curl:mode:head:
	@curl -s -I http://localhost:8787/v1/guardian/mode | grep -i x-guardian-mode || true

.PHONY: curl:metrics
curl:metrics:
	@curl -s http://localhost:8787/metrics | grep -E '^guardian_mode' || true

.PHONY: curl:templates:count
curl:templates:count:
	@curl -s http://localhost:8787/v1/api/templates/count | jq .

.PHONY: smoke:templates smoke:execute
smoke:templates:
	@echo "→ Canonical: /v1/api/templates"; \
	curl -s "http://localhost:8787/v1/api/templates?limit=5" | jq '.' | sed -n '1,20p'; \
	echo "→ Count: /v1/api/templates/count"; \
	curl -s "http://localhost:8787/v1/api/templates/count" | jq '.'; \
	echo "→ Shim: /templates"; \
	curl -s "http://localhost:8787/templates?limit=5" | jq '.' | sed -n '1,20p'

smoke:execute:
	@TID=$${SMOKE_TEMPLATE_ID:-demo.echo}; \
	echo "→ POST /v1/api/execute {templateId: $$TID}"; \
	curl -s -H 'content-type: application/json' -d "$$(jq -nc --arg id $$TID '{templateId:$$id, args:{msg:"hello"}}')" \
	  http://localhost:8787/v1/api/execute | jq '.' | sed -n '1,30p'; \
	echo "→ POST /run/$$TID (shim)"; \
	curl -s -H 'content-type: application/json' -d "$$(jq -nc '{args:{msg:"hello"}}')" \
	  http://localhost:8787/run/$$TID | jq '.' | sed -n '1,30p'

.PHONY: smoke:bff smoke:web smoke:up
smoke:bff:
	@echo "→ health"; curl -sf http://localhost:8787/health | jq .
	@echo "→ mode (GET)"; curl -sfI http://localhost:8787/v1/guardian/mode | tr -d '\r' | grep -i x-guardian-mode
	@echo "→ templates (first 3)"; curl -sf 'http://localhost:8787/v1/api/templates?limit=3' | jq '{ids:[.[0].id] // {}}' >/dev/null 2>&1 || true; \
	curl -sf 'http://localhost:8787/v1/api/templates?limit=3' | jq '.' | sed -n '1,30p'

smoke:web:
	@echo "→ FE expects Guardian badge & template count visible. Open http://localhost:5000"

smoke:up:
	@pnpm --filter workbench/bff run dev & \
	 pnpm --filter workbench/frontend run dev & \
	 sleep 3 && $(MAKE) smoke:bff || true

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
