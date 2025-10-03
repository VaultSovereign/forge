# Quieter nested make
MAKEFLAGS += --no-print-directory

.PHONY: forge-prepush install-git-hooks proposal-verify purge-check quality dev lint lint-fix lint-quiet docs-openapi typecheck doctor prepush-scans \
        dev-bff dev-web build-bff build-web curl-mode curl-mode-head curl-metrics curl-templates-count \
        smoke-bff smoke-web smoke-up smoke-guardian smoke-templates smoke-execute docs-internal-dev docs-external-dev \
        docs-internal-preview docs-external docs-sitemap status commits \
        audit audit-gpt5 audit-claude-opus audit-deepseek \
        cons-audit cons-audit-verify cons-audit-demo cons-audit-seal \
        proxy-health proxy-who proxy-drill proxy-receipts \
        mandala-stamp mandala-png mandala-webp mandala-social mandala-open mandala-link-check

FORGE_FAST ?= 0

# Path anchors
PROXY_DIR := $(CURDIR)/ai-companion-proxy-starter
MANDALA := docs/VaultMesh_Mandala.svg

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

lint-fix:
	@echo ">> lint --fix"
	@pnpm -w exec eslint . --ext .ts,.tsx --fix

lint-quiet:
	@echo ">> lint (errors only)"
	@pnpm -w exec eslint -c .eslintrc.json . --ext .ts,.tsx --quiet

docs-openapi:
	@echo ">> regenerate OpenAPI docs"
	@pnpm -w run docs:openapi:md

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

# Show last commit scope and CI state for current branch
status:
	@BR=$$(git rev-parse --abbrev-ref HEAD); \
	MSG=$$(git log -1 --pretty=%s); S=$${MSG%%:*}; [ "$$S" = "$$MSG" ] && S=unknown; \
	CI=$$(gh run list --branch "$$BR" --workflow .github/workflows/ci.yml -L 1 --json status,conclusion 2>/dev/null | jq -r 'if length==0 then "no_run/-" else (.[0].status+"/"+(.[0].conclusion // "-")) end'); \
	printf "%s → CI %s (%s)\n" "$$S" "$$CI" "$$BR"

# Group the last 15 commits by scope (prefix before ':')
commits:
	@git log --no-merges --pretty=format:'%h %s' -n 15 \
	| awk -F: '{ if ($$2=="") scope="unknown"; else scope=$$1; msg=$$0; sub(/^[^:]+:[ ]?/,"",msg); commits[scope]=(commits[scope]?commits[scope] ORS:"") "  - " $$1 " " msg } END { for (s in commits) { print s ":"; print commits[s]; print "" } }'

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

.PHONY: gif-risk-flow
# Records a ~12s GIF of Risk Gate panel interactions.
# macOS uses avfoundation; Linux uses x11grab. Requires ffmpeg.
gif-risk-flow:
	@echo "Recording Risk Gate flow…"
	@if [ "$$(uname)" = "Darwin" ]; then \
	  echo "Open the Workbench in a visible window, then recording starts in 3s…"; \
	  sleep 3; \
	  ffmpeg -f avfoundation -framerate 30 -t 12 -i "1:none" -vf "scale=1280:-1:flags=lanczos,fps=15" /tmp/risk-flow.mp4 -y >/dev/null 2>&1 || true; \
	  ffmpeg -i /tmp/risk-flow.mp4 -vf "fps=12,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" /tmp/risk-flow.gif -y >/dev/null 2>&1 || true; \
	else \
	  echo "Linux capture (X11): set $$DISPLAY and ensure ffmpeg installed"; \
	  sleep 3; \
	  ffmpeg -video_size 1280x800 -framerate 30 -f x11grab -i $$DISPLAY -t 12 /tmp/risk-flow.mp4 -y >/dev/null 2>&1 || true; \
	  ffmpeg -i /tmp/risk-flow.mp4 -vf "fps=12,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" /tmp/risk-flow.gif -y >/dev/null 2>&1 || true; \
	fi; \
	echo "→ GIF at /tmp/risk-flow.gif"

gif\:risk-flow:
	@$(MAKE) gif-risk-flow --no-print-directory

.PHONY: curl-risk-latest curl-risk-gate
curl-risk-latest:
	@curl -sS http://localhost:8787/v1/risk/latest | jq

curl-risk-gate:
	@curl -sS -X POST http://localhost:8787/v1/risk/policy-gate \
	  -H 'content-type: application/json' --data '{}' | jq

curl\:risk\:latest:
	@$(MAKE) curl-risk-latest --no-print-directory

curl\:risk\:gate:
	@$(MAKE) curl-risk-gate --no-print-directory

.PHONY: curl-risk-receipts
# Optional date window: make curl:risk:receipts FROM=2025-10-01T00:00:00Z TO=2025-10-03T00:00:00Z
curl-risk-receipts:
	@URL="http://localhost:8787/v1/risk/receipts/export"; \
	[ -n "$(FROM)" ] && URL="$$URL?from=$(FROM)"; \
	[ -n "$(TO)" ] && URL="$$URL$$([ -n "$(FROM)" ] && echo '&' || echo '?')to=$(TO)"; \
	echo "→ GET $$URL"; \
	curl -sS "$$URL" | jq '.generated_at, .count'

curl\:risk\:receipts:
	@$(MAKE) curl-risk-receipts --no-print-directory

.PHONY: curl-risk-verify
# KIND=register|gate (optional). Default: latest of either.
curl-risk-verify:
	@URL="http://localhost:8787/v1/risk/verify"; \
	[ -n "$(KIND)" ] && BODY="$$(jq -nc --arg k "$(KIND)" '{kind:$$k}')" || BODY="{}"; \
	echo "→ POST $$URL  body=$$BODY"; \
	curl -sS -X POST "$$URL" -H 'content-type: application/json' --data "$$BODY" | jq

curl\:risk\:verify:
	@$(MAKE) curl-risk-verify --no-print-directory

.PHONY: curl-risk-verify-line
# Use: make curl:risk:verify-line LINE='{"keyword":"operations-risk-register",...}'
curl-risk-verify-line:
	@URL="http://localhost:8787/v1/risk/verify"; \
	BODY=$$(jq -nc --arg line '$(LINE)' '{line:$$line}'); \
	echo "→ POST $$URL"; \
	curl -sS -X POST "$$URL" -H 'content-type: application/json' --data "$$BODY" | jq

curl\:risk\:verify-line:
	@$(MAKE) curl-risk-verify-line --no-print-directory

.PHONY: curl-risk-list
curl-risk-list:
	@curl -sS "http://localhost:8787/v1/risk/list?limit=$${LIMIT:-25}" | jq '.count, (.events[0] | {keyword,ts,stored_hash})'

curl\:risk\:list:
	@$(MAKE) curl-risk-list --no-print-directory

.PHONY: curl-risk-list-page
# Usage: make curl:risk:list:page LIMIT=50 CURSOR="events-2025-10-02.jsonl:42" KEYWORD=register BEFORE=2025-10-02T23:59:59Z SINCE=2025-10-01T00:00:00Z
curl-risk-list-page:
	@URL="http://localhost:8787/v1/risk/list?limit=$${LIMIT:-50}"; \
	[ -n "$(KEYWORD)" ] && URL="$$URL&keyword=$(KEYWORD)"; \
	[ -n "$(BEFORE)" ] && URL="$$URL&before_ts=$(BEFORE)"; \
	[ -n "$(SINCE)" ] && URL="$$URL&since_ts=$(SINCE)"; \
	[ -n "$(CURSOR)" ] && URL="$$URL&cursor=$(CURSOR)"; \
	echo "→ GET $$URL"; \
	curl -sS "$$URL" | jq '{count, next_cursor, prev_cursor, window}'

curl\:risk\:list\:page:
	@$(MAKE) curl-risk-list-page --no-print-directory

.PHONY: run-risk-policy-gate
# Usage: make run:risk-policy-gate REPORT=path/to/risk_register.json [PROFILE=vault]
run-risk-policy-gate:
	@if [ -z "$(REPORT)" ]; then echo "Set REPORT=path/to/risk_register.json"; exit 2; fi
	@if [ ! -f "$(REPORT)" ]; then echo "REPORT file not found: $(REPORT)"; exit 2; fi
	@PROFILE_ARG=$${PROFILE:-vault}; \
	ARGS=$$(jq -c --argfile r "$(REPORT)" '{report: $$r}'); \
	echo "→ Running policy gate with $$PROFILE_ARG on $(REPORT)"; \
	pnpm run vm -- run operations-risk-policy-gate -p $$PROFILE_ARG -a "$$ARGS" -f json

run\:risk-policy-gate:
	@$(MAKE) run-risk-policy-gate --no-print-directory


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

# -------------------------------
# Consciousness Spectrum Analyzer — Forge Gates
# -------------------------------
SCHEMA_IN ?= schemas/input.consciousness.spectrum_analyzer.schema.json
SCHEMA_OUT ?= schemas/output.schema.json
AUDIT_OUT ?= artifacts/reports

.PHONY: cons-audit cons-audit-verify cons-audit-demo cons-audit-seal

cons-audit:
	@mkdir -p $(AUDIT_OUT)
	@node scripts/consciousness-spectrum-analyzer.mjs --input "$$INPUT" --out $(AUDIT_OUT)/report.$$(date -u +%Y%m%dT%H%M%SZ).yaml

cons-audit-verify:
	@jq -e . $(SCHEMA_OUT) >/dev/null
	@node scripts/jsonschema-validate.mjs $(AUDIT_OUT) $(SCHEMA_OUT) '#/definitions/consciousness/spectrum_analyzer'

cons-audit-demo:
	@INPUT='{"consciousness_type":"guardian","model_context":"security","eval_focus":"all","artifact_hash":"0d7a72bc1048e15d6b6a5a7018e3fb7021bab42664a026164a723b9efa6ec7fd:2891d483b8e9c7ed6885f08ecc6c0b3cc39963e11e5c6994e445a10becb162b8"}' $(MAKE) cons-audit

cons-audit-seal:
	@mkdir -p artifacts/seals
	@command -v b3sum >/dev/null 2>&1 && b3sum $(AUDIT_OUT)/*.yaml | tee artifacts/seals/consciousness.reports.b3sum || shasum -a 256 $(AUDIT_OUT)/*.yaml | tee artifacts/seals/consciousness.reports.sha256
	@echo "$$(date -u +%FT%TZ)  cons-audit sealed" | tee -a artifacts/seals/SEALLOG.txt

# ----- AI Companion Proxy shortcuts (root) -----
.PHONY: proxy-health proxy-url proxy-token proxy-who proxy-drill \
        proxy-receipts proxy-receipts-verify proxy-receipts-validate \
        proxy-receipts-gc proxy-receipts-root

proxy-health:
	@$(MAKE) -C $(PROXY_DIR) proxy-health-auth

proxy-url:
	@$(MAKE) -C $(PROXY_DIR) proxy-url

proxy-token:
	@$(MAKE) -C $(PROXY_DIR) proxy-token

proxy-who:
	@$(MAKE) -C $(PROXY_DIR) proxy-who

proxy-drill:
	@ART_DIR="$(PROXY_DIR)/artifacts/drills" bash $(PROXY_DIR)/scripts/guardian-drill.sh ; \
	ls -1t $(PROXY_DIR)/artifacts/drills/proxy-guardian-*.json 2>/dev/null | head -n1 | \
	xargs -I{} sh -c 'echo "🧾 Latest receipt: {}"; if command -v jq >/dev/null 2>&1; then jq . {}; else cat {}; fi'

proxy-receipts:
	@DIR="$(PROXY_DIR)/artifacts/drills"; \
	echo "📜 Guardian Drill Receipts (latest 10)"; echo "======================================"; \
	for f in $$(ls -1t $$DIR/proxy-guardian-*.json 2>/dev/null | head -n 10); do \
		if command -v jq >/dev/null 2>&1; then \
			printf "• %s | %s | %s\n" "$$(jq -r .ts $$f)" "$$(jq -r .status $$f)" "$$(jq -r .id $$f)"; \
		else echo "• $$f"; fi; \
	done

proxy-receipts-verify:
	@$(MAKE) -C $(PROXY_DIR) proxy-receipts-verify

proxy-receipts-validate:
	@$(MAKE) -C $(PROXY_DIR) proxy-receipts-validate

proxy-receipts-gc:
	@$(MAKE) -C $(PROXY_DIR) proxy-receipts-gc

proxy-receipts-root:
	@$(MAKE) -C $(PROXY_DIR) proxy-receipts-root

.PHONY: makefile-lint
makefile-lint:
	@ if sed 's/\\:/.ESC/g' Makefile $(PROXY_DIR)/Makefile | grep -nE '^\s*\.PHONY:.*:' >/dev/null 2>&1; then \
	    echo "❌ .PHONY contains colon’d names"; exit 1; fi
	@ if grep -nE '^[^#[:space:]].*:' Makefile $(PROXY_DIR)/Makefile | grep ':' | grep -v '::' >/dev/null 2>&1; then \
	    echo "✅ Target names may include colon, but ensure recipes are correct"; fi
	@ awk 'prev==1 && $$0 !~ /^\t/ {print "⚠ recipe not starting with tab @ line " NR " in Makefile"} {prev=(/^[^#[:space:]].*:/)}' Makefile >/dev/null || true

# --- Codebase Audit (with model selection) ---

.PHONY: audit audit-gpt5 audit-claude-opus audit-deepseek

audit:
	@echo "🔍 Running codebase audit with default model..."
	@node dist/cli/index.js run codebase-audit

audit-gpt5:
	@bash scripts/audit-with-gpt5.sh openai/gpt-5

audit-claude-opus:
	@bash scripts/audit-with-gpt5.sh anthropic/claude-opus-4

audit-deepseek:
	@bash scripts/audit-with-gpt5.sh deepseek/deepseek-r1-distill-llama-70b

# --- Gemini Code Execution ---

.PHONY: gemini\-code gemini\-code\-vertex gemini\-help

# Dash aliases (for CI/CD or shells that dislike colons)
.PHONY: gemini-code gemini-code-vertex
gemini-code: gemini\:code
gemini-code-vertex: gemini\:code\:vertex

gemini\:help:
	@echo 'make gemini:code PROMPT="sum of first 50 primes" --'
	@echo 'make gemini:code:vertex PROMPT="factorial of 50" -- (uses $$GEMINI_VERTEX_LOCATION or us-central1)'

gemini\:code:
	@node scripts/gemini-code-exec.mjs --prompt "$(PROMPT)"

gemini\:code\:vertex:
	@node scripts/gemini-code-exec.mjs --vertex --location=$${GEMINI_VERTEX_LOCATION:-us-central1} --prompt "$(PROMPT)"

# ============================================================================
# Mandala — Interactive SVG diagram of the Five Pillars
# ============================================================================

mandala-stamp:
	@echo "🌀 Stamping mandala with latest Merkle root..."
	@node scripts/mandala-stamp-root.mjs

# Requires inkscape or rsvg-convert (choose one that's installed)
mandala-png:
	@echo "🖼️  Exporting mandala to PNG..."
	@if command -v inkscape >/dev/null 2>&1; then \
	    inkscape $(MANDALA) --export-type=png --export-filename=docs/VaultMesh_Mandala.png --export-dpi=220; \
	  elif command -v rsvg-convert >/dev/null 2>&1; then \
	    rsvg-convert -f png -o docs/VaultMesh_Mandala.png $(MANDALA); \
	  else \
	    echo "❌ Install inkscape or rsvg-convert to export PNG"; \
	    exit 1; \
	  fi
	@echo "✅ docs/VaultMesh_Mandala.png"

mandala-webp:
	@echo "🖼️  Exporting mandala to WebP..."
	@if command -v cwebp >/dev/null 2>&1; then \
	    cwebp -q 92 docs/VaultMesh_Mandala.png -o docs/VaultMesh_Mandala.webp; \
	    echo "✅ docs/VaultMesh_Mandala.webp"; \
	  else \
	    echo "❌ Install cwebp (libwebp) to export WebP"; \
	  fi

mandala-open:
	@echo "🌀 Opening mandala..."
	@xdg-open $(MANDALA) 2>/dev/null || open $(MANDALA) 2>/dev/null || echo "ℹ️  Open $(MANDALA) in your browser"

mandala-link-check:
	@echo "🔗 Checking mandala links..."
	@node scripts/mandala-link-check.mjs

mandala-social:
	@echo "📱 Exporting mandala for social media (1600×1600)..."
	@if command -v rsvg-convert >/dev/null 2>&1; then \
	    rsvg-convert -f png -w 1600 -o docs/VaultMesh_Mandala_social.png $(MANDALA); \
	    echo "✅ docs/VaultMesh_Mandala_social.png (1600×1600)"; \
	  else \
	    echo "❌ Install rsvg-convert (librsvg2-bin) for social export"; \
	    exit 1; \
	  fi
	@if command -v cwebp >/dev/null 2>&1; then \
	    cwebp -q 92 docs/VaultMesh_Mandala_social.png -o docs/VaultMesh_Mandala_social.webp; \
	    echo "✅ docs/VaultMesh_Mandala_social.webp (~100KB)"; \
	  else \
	    echo "⚠️  Install cwebp for WebP optimization (optional)"; \
	  fi


# --- Docs Drills Shortcuts ---
.PHONY: drill:ledger

drill\:ledger:
	@echo "Open: docs/DRILLS/GUARDIAN_LEDGER.html"

.PHONY: drill:deploy drill:destroy
drill\:deploy:
	@echo "Open: docs/DRILLS/GUARDIAN_DEPLOY_DRILL.html"

drill\:destroy:
	@echo "Open: docs/DRILLS/GUARDIAN_DESTROY_DRILL.html"

.PHONY: prove:egress prove:budget
prove\:egress:
	@echo "NAT IP(s):"; 	gcloud compute addresses list --filter="name~nat AND region=europe-west3" 	  --format="table(name,address)"

prove\:budget:
	@BILLING=$$(gcloud beta billing accounts list --format='value(name)' | head -1); 	echo "Budget accounts: $$BILLING"; 	echo "Use docs block to create thresholds."


.PHONY: drill:ledger:url
drill\:ledger\:url:
	@echo "Pages URL:"
	@echo "https://vaultsovereign.github.io/$(shell basename $$PWD)/DRILLS/GUARDIAN_LEDGER.html"

.PHONY: drill:ledger:url
drill\:ledger\:url:
	@echo "Pages URL:"
	@echo "https://vaultsovereign.github.io/$(shell basename $$PWD)/DRILLS/GUARDIAN_LEDGER.html"

.PHONY: prove:docs
prove\:docs:
	@DOCS_DOMAIN=$${DOCS_DOMAIN:-docs.vaultmesh.org}; \
	echo "CNAME for $$DOCS_DOMAIN:"; \
	{ command -v dig >/dev/null 2>&1 && dig +short CNAME $$DOCS_DOMAIN || true; } || true; \
	{ command -v host >/dev/null 2>&1 && host -t CNAME $$DOCS_DOMAIN 2>/dev/null || true; } || true; \
	echo ""; \
	echo "HTTPS HEAD:"; \
	curl -sSI "https://$$DOCS_DOMAIN/DRILLS/GUARDIAN_LEDGER.html" | head -n 1 || true; \
	echo ""; \
	echo "HTTP → HTTPS redirect (optional):"; \
	curl -sI "http://$$DOCS_DOMAIN/DRILLS/GUARDIAN_LEDGER.html" | sed -n '1,3p' || true
