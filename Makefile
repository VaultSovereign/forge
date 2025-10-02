.PHONY: forge-prepush install-git-hooks proposal-verify purge-check quality dev lint typecheck doctor prepush-scans \
        dev-bff dev-web build-bff build-web curl-mode curl-mode-head curl-metrics curl-templates-count \
        smoke-bff smoke-web smoke-up smoke-guardian smoke-templates smoke-execute docs-internal-dev docs-external-dev \
        docs-internal-preview docs-external docs-sitemap

FORGE_FAST ?= 0

# --- Purification & Quality Gates ---

purge-check:
	@echo "🔍 Checking for disallowed artifacts..."
	@if grep -RIn --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=attached_assets -E 'replit' . 2>/dev/null | grep -v '.gitignore:'; then \
		echo "❌ Found disallowed 'replit' references"; \
		exit 1; \
	fi
	@echo "✅ Purge check passed"

quality:
	@echo "🔧 Running quality checks..."
	@pnpm install --frozen-lockfile
	@pnpm format:check
	@pnpm lint
	@echo "✅ Quality checks passed"

## Default dev: alias to frontend dev
dev: dev-web
	@:

lint:
	@echo ">> lint"
	@pnpm -w run lint

typecheck:
	@echo ">> typecheck"
	@pnpm -w run typecheck

doctor: build
	@echo ">> doctor"
	@if [ -n "$${OPENAI_API_KEY}$${OPENROUTER_API_KEY}$${OLLAMA_HOST}" ]; then \
	  node dist/cli/index.js doctor ; \
	else \
	  node dist/cli/index.js doctor --skip-provider ; \
	fi

prepush-scans:
	@echo ">> prepush-scans (FORGE_FAST=$(FORGE_FAST) FORGE_SKIP_REMOTE_SCANS=$(FORGE_SKIP_REMOTE_SCANS))"
	@env FORGE_FAST=$(FORGE_FAST) \
	    FORGE_SKIP_REMOTE_SCANS=$(FORGE_SKIP_REMOTE_SCANS) \
	    bash scripts/forge-prepush.sh

forge-prepush: purge-check quality typecheck build doctor prepush-scans
	@echo ">> forge-prepush complete"

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
.PHONY: dev-bff dev-web
dev-bff:
	cd workbench/bff && npm i --no-audit --no-fund && npm run dev
dev-web:
	cd workbench/frontend && npm i --no-audit --no-fund && npm run dev

## Production-style builds (optional)
.PHONY: build build-bff build-web
build: build-bff build-web
build-bff:
	cd workbench/bff && npm run build
build-web:
	cd workbench/frontend && npm run build

## Run tests (if present)
test:
	npm test || true

## Clean typical build outputs
clean:
	rm -rf workbench/bff/dist workbench/frontend/dist agents/build

.PHONY: curl-mode smoke-guardian

curl-mode:
	@curl -s http://localhost:8787/v1/guardian/mode | jq .

smoke-guardian: build-bff
	@node -e "fetch('http://localhost:8787/v1/guardian/mode').then(r=>r.json()).then(j=>{const m=j.mode;const ok=['stub','agent','unknown'].includes(m);console.log('guardian mode:', m); if(!ok) process.exit(1);}).catch(e=>{console.error(e);process.exit(1)})"

.PHONY: curl-mode-head
curl-mode-head:
	@curl -s -I http://localhost:8787/v1/guardian/mode | grep -i x-guardian-mode || true

.PHONY: curl-metrics
curl-metrics:
	@curl -s http://localhost:8787/metrics | grep -E '^guardian_mode' || true

.PHONY: curl-templates-count
curl-templates-count:
	@curl -s http://localhost:8787/v1/api/templates/count | jq .

.PHONY: smoke-templates smoke-execute
smoke-templates:
	@echo "→ Canonical: /v1/api/templates"; \
	curl -s "http://localhost:8787/v1/api/templates?limit=5" | jq '.' | sed -n '1,20p'; \
	echo "→ Count: /v1/api/templates/count"; \
	curl -s "http://localhost:8787/v1/api/templates/count" | jq '.'; \
	echo "→ Shim: /templates"; \
	curl -s "http://localhost:8787/templates?limit=5" | jq '.' | sed -n '1,20p'

smoke-execute:
	@TID=$${SMOKE_TEMPLATE_ID:-demo.echo}; \
	echo "→ POST /v1/api/execute {templateId: $$TID}"; \
	curl -s -H 'content-type: application/json' -d "$$(jq -nc --arg id $$TID '{templateId:$$id, args:{msg:"hello"}}')" \
	  http://localhost:8787/v1/api/execute | jq '.' | sed -n '1,30p'; \
	echo "→ POST /run/$$TID (shim)"; \
	curl -s -H 'content-type: application/json' -d "$$(jq -nc '{args:{msg:"hello"}}')" \
	  http://localhost:8787/run/$$TID | jq '.' | sed -n '1,30p'

.PHONY: smoke-bff smoke-web smoke-up
smoke-bff:
	@echo "→ health"; curl -sf http://localhost:8787/health | jq .
	@echo "→ mode (GET)"; curl -sfI http://localhost:8787/v1/guardian/mode | tr -d '\r' | grep -i x-guardian-mode
	@echo "→ templates (first 3)"; curl -sf 'http://localhost:8787/v1/api/templates?limit=3' | jq '{ids:[.[0].id] // {}}' >/dev/null 2>&1 || true; \
	curl -sf 'http://localhost:8787/v1/api/templates?limit=3' | jq '.' | sed -n '1,30p'

smoke-web:
	@echo "→ FE expects Guardian badge & template count visible. Open http://localhost:5000"

smoke-up:
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


# -------------------------------
# Developer convenience targets
# Auto-choose pnpm if available; otherwise npm
# -------------------------------

SHELL := /bin/bash
PKG := $(shell command -v pnpm >/dev/null 2>&1 && echo pnpm || echo npm)

PORT ?= 3000
BFF_PORT ?= 8787
VITE_DEV_PORT ?= 5173
AI_CORE_MODE ?= mock

.PHONY: preview dev2 build-all start-bff kill smoke tokened-smoke env

## Build both FE+BFF
build-all: build-web build-bff

## Single-port preview (builds + BFF serves SPA on PORT)
preview: build-all
	@echo "=> Starting single-port BFF on PORT=$(PORT)"
	@PORT=$(PORT) AI_CORE_MODE=$(AI_CORE_MODE) node workbench/bff/dist/server.js

## Alt dev duo helper (keeps existing 'dev' intact)
dev2:
	@echo "=> Dev duo: BFF_PORT=$(BFF_PORT) VITE_DEV_PORT=$(VITE_DEV_PORT)"
	@echo "   shell A: BFF_PORT=$(BFF_PORT) $(MAKE) start-bff"
	@echo "   shell B: VITE_DEV_PORT=$(VITE_DEV_PORT) $(PKG) --prefix workbench/frontend run dev"

## Start BFF only (dev mode defaults to BFF_PORT)
start-bff:
	@echo "=> Starting BFF on BFF_PORT=$(BFF_PORT)"
	@NODE_ENV=development PORT=$(BFF_PORT) AI_CORE_MODE=$(AI_CORE_MODE) node workbench/bff/dist/server.js

## Kill stuck BFF/dev processes
kill:
	-@pkill -f "workbench/bff.*server" || true
	-@pkill -f "node .*bff" || true

## Smoke (dev bypass) - requires scripts/smoke-workbench.sh
smoke: build-all
	@echo "=> Running smoke with AUTH_DEV_BYPASS=1 on PORT=$(PORT)"
	@chmod +x scripts/smoke-workbench.sh
	@AUTH_DEV_BYPASS=1 PORT=$(PORT) node workbench/bff/dist/server.js & echo $$! > .bff.pid
	@sleep 1
	@PORT=$(PORT) ./scripts/smoke-workbench.sh || (echo "Smoke failed"; kill `cat .bff.pid` || true; exit 1)
	@kill `cat .bff.pid` || true

## Tokened smoke with dev signer + JWKS
tokened-smoke: build-all
	@echo "=> Running tokened smoke (AUTH_DEV_SIGNER=1, real JWT verify) on PORT=$(PORT)"
	@chmod +x scripts/smoke-workbench.sh
	@AUTH_DEV_SIGNER=1 OIDC_ISSUER=http://127.0.0.1/ OIDC_AUDIENCE=vaultmesh-dev OIDC_JWKS_URL=http://127.0.0.1:$(PORT)/dev/jwks.json PORT=$(PORT) node workbench/bff/dist/server.js & echo $$! > .bff.pid
	@sleep 1
	@TOKEN=$$(curl -fsS -X POST -H 'content-type: application/json' -d '{"sub":"local-ci","roles":["operator","auditor"]}' http://127.0.0.1:$(PORT)/v1/dev/token | jq -r .token); 	  AUTH_HEADER="Authorization: Bearer $$TOKEN" PORT=$(PORT) ./scripts/smoke-workbench.sh || (echo "Tokened smoke failed"; kill `cat .bff.pid` || true; exit 1)
	@kill `cat .bff.pid` || true

## Show selected toolchain
env:
	@echo "PKG=$(PKG)"
	@node -v || true
	@$(PKG) -v || true

# compat: old colon build target (no-op wrapper to hyphen target)
build\:bff: build-bff
	@:

# compat: old colon build target (no-op wrapper to hyphen target)
build\:web: build-web
	@:

# -------------------------------
# Docs convenience targets
# -------------------------------

## Dev duo (HMR) with docs served by BFF at /docs
docs-internal-dev:
	@echo "=> Dev duo: internal docs via /docs (BFF) | BFF_PORT=$(BFF_PORT) VITE_DEV_PORT=$(VITE_DEV_PORT)"
	@echo "   shell A: EXPOSE_DOCS=1 PORT=$(BFF_PORT) $(PKG) --prefix workbench/bff run dev"
	@echo "   shell B: VITE_EXPOSE_DOCS=1 VITE_DEV_PORT=$(VITE_DEV_PORT) VITE_BFF_PORT=$(BFF_PORT) $(PKG) --prefix workbench/frontend run dev"

## Dev duo (HMR) with external docs URL
# Usage: make docs-external-dev DOCS_URL=https://mydomain/docs [BFF_PORT=8787 VITE_DEV_PORT=5173]
docs-external-dev:
	@[ -n "$(DOCS_URL)" ] || (echo "DOCS_URL is required, e.g. make docs:external-dev DOCS_URL=https://mydomain/docs"; exit 2)
	@echo "=> Dev duo: external docs at $(DOCS_URL) | BFF_PORT=$(BFF_PORT) VITE_DEV_PORT=$(VITE_DEV_PORT)"
	@echo "   shell A: PORT=$(BFF_PORT) $(PKG) --prefix workbench/bff run dev"
	@echo "   shell B: VITE_EXPOSE_DOCS=1 VITE_DOCS_URL=$(DOCS_URL) VITE_DEV_PORT=$(VITE_DEV_PORT) VITE_BFF_PORT=$(BFF_PORT) $(PKG) --prefix workbench/frontend run dev"

## Single-port preview with docs served by BFF at /docs
docs-internal-preview: build-all
	@echo "=> Single-port preview with internal docs at /docs on PORT=$(PORT)"
	@EXPOSE_DOCS=1 PORT=$(PORT) AI_CORE_MODE=$(AI_CORE_MODE) node workbench/bff/dist/server.js

## Single-port preview with external docs URL
# Usage: make docs-external DOCS_URL=https://mydomain/docs [PORT=3000]
docs-external: build-all
	@[ -n "$(DOCS_URL)" ] || (echo "DOCS_URL is required, e.g. make docs:external DOCS_URL=https://mydomain/docs"; exit 2)
	@echo "=> Single-port preview; Docs link points to $(DOCS_URL) on PORT=$(PORT)"
	@PORT=$(PORT) AI_CORE_MODE=$(AI_CORE_MODE) node workbench/bff/dist/server.js


.PHONY: hooks
hooks:
	@$(PKG) -w run prepare || $(PKG) run prepare
	@npx husky add .husky/pre-commit "bash .husky/_precommit_legacy_guard.sh" || true

.PHONY: docs-sitemap
## Generate docs/SITEMAP.md from all Markdown files under docs/
docs-sitemap:
	@$(PKG) run docs:sitemap
