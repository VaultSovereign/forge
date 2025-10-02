# ⚔️ Forge Command Language — Starter Repo (Blueprint v1)

[![CI](https://github.com/VaultSovereign/forge/actions/workflows/ci.yml/badge.svg)](https://github.com/VaultSovereign/forge/actions/workflows/ci.yml)
[![workbench-smoke](https://github.com/VaultSovereign/forge/actions/workflows/workbench-smoke.yml/badge.svg)](https://github.com/VaultSovereign/forge/actions/workflows/workbench-smoke.yml)
[![docs-link-check](https://github.com/VaultSovereign/forge/actions/workflows/docs-link-check.yml/badge.svg)](https://github.com/VaultSovereign/forge/actions/workflows/docs-link-check.yml)
[![pages](https://img.shields.io/github/deployments/VaultSovereign/forge/github-pages?label=pages)](https://github.com/VaultSovereign/forge/deployments/github-pages)
[![GHCR](https://img.shields.io/badge/ghcr-forge-6f42c1?logo=github&logoColor=white)](https://ghcr.io/vaultsovereign/forge)
[![Release](https://img.shields.io/github/v/release/VaultSovereign/forge?display_name=tag&sort=semver)](https://github.com/VaultSovereign/forge/releases)
[![Docs Index](https://img.shields.io/badge/docs-index-blue)](https://VaultSovereign.github.io/forge/INDEX.html)
[![Docs Sitemap](https://img.shields.io/badge/docs-sitemap-blueviolet)](https://VaultSovereign.github.io/forge/SITEMAP.md)
[![API](https://img.shields.io/badge/api-OpenAPI-green)](https://github.com/VaultSovereign/forge/blob/main/docs/OPENAPI.md)
<br><sub>build • smoke • docs-check • pages • ghcr • release • docs-index • docs-sitemap • api</sub>
<br>
## 🔗 Links
- [Sales Deck](https://VaultSovereign.github.io/forge/) — live preview (HTML & PDF)
- [One-Pager](https://VaultSovereign.github.io/forge/one-pager.pdf)
- [Demo Data](https://VaultSovereign.github.io/forge/demo/)

**VaultMesh Forge** — Earth’s Civilization Ledger; sovereign prompt orchestration for compliance and cybersecurity.  

➡️ [Quickstart](docs/QUICKSTART.md) — one-command demo to run locally, or use the prebuilt image in Docker (see [Docker (GHCR)](#docker-ghcr)).


→ Quick link: <a href="#run-modes">Run Modes</a>
<br/>
→ <a href="docs/PROD_CHECKLIST.md">Production Checklist</a>
<br/>
→ <a href="docs/OPERATIONS_RUNBOOK.md">Operations Runbook</a>

## 📑 Table of Contents

- [🔗 Links](#links)
- [📚 Documentation Index](#documentation-index)
- [🏃 Run Modes](#run-modes)
  - [Docs Links (internal vs external)](#docs-links-internal-vs-external)
- [🐳 Docker (GHCR)](#docker-ghcr)
- [🔌 API](#api)
- [🤝 Contributing](CONTRIBUTING.md)
- [🔝 Back to top](#readme)

## 📚 Documentation Index

- <a href="docs/README_RUN_MODES.md">Run Modes</a> — how to run locally / in Replit (single-port, duo/HMR, smoke)
- <a href="docs/PROD_CHECKLIST.md">Production Checklist</a> — must-pass gates before prod rollout
- <a href="docs/OPERATIONS_RUNBOOK.md">Operations Runbook</a> — incident response playbooks
- <a href="docs/SECURITY.md">Security Overview</a> — auth, RBAC, env flags, quick tests
- <a href="CONTRIBUTING.md">Contributing</a> — setup, hooks, Make targets, docs, and commit style
- <a href="#docker-ghcr">Docker (GHCR)</a> — pull & run the prebuilt image


## API

- Machine-readable OpenAPI JSON: `/v1/openapi.json`
  - Available in development by default, or in production when `EXPOSE_OPENAPI=1` is set on the BFF.
  - The header shows an “API” link when `import.meta.env.DEV` or `VITE_EXPOSE_OPENAPI=1` is set at build/dev time.

Quick check (single-port on :3000):
```bash
curl -fsS http://127.0.0.1:3000/v1/openapi.json | jq '.info'
```

- Human-readable reference: `docs/OPENAPI.md` (auto-generated from `docs/openapi/workbench.yaml`)
  - Serve via BFF at `/docs` with `EXPOSE_DOCS=1`; show “Docs” link with `VITE_EXPOSE_DOCS=1` (override URL via `VITE_DOCS_URL`).

### Authenticated execute example (dev signer)

Use the same short‑lived token to call a secured execute route.

In dev or CI (with `AUTH_DEV_SIGNER=1`):

```bash
# 1) Mint a token (operator role is required for execute:run)
TOKEN=$(curl -s -X POST -H "content-type: application/json" \n  -d '{"sub":"local-ci","roles":["operator"]}' \n  http://localhost:3000/v1/dev/token | jq -r .token)

# 2) Execute a template (REST)
curl -s -X POST \n  -H "authorization: Bearer $TOKEN" \n  -H "content-type: application/json" \n  -d '{"templateId":"demo.echo","profile":"vault","args":{"msg":"hello"}}' \n  http://localhost:3000/v1/api/execute | jq .

# 3) Execute with streaming (SSE)
curl -Ns "http://localhost:3000/v1/api/execute/stream?templateId=demo.echo&profile=vault&args=%7B%22msg%22%3A%22hello%22%7D" | head -n 20
```

Notes
- `execute:run` requires a role that grants that action (see RBAC mapping).
- SSE returns a text/event-stream with keepalive and log/done events.

### RBAC quick note

- Roles map to actions (see `workbench/bff/config/rbac.yaml`):
  - `operator`: `templates:read`, `templates:write`, `execute:run`, `ledger:read`
  - `auditor`: `templates:read`, `ledger:read`
  - `template-author`: `templates:read`, `templates:write`
- Tokens must carry roles at the claim path configured by `RBAC_ROLES_CLAIM` (defaults to `https://vaultmesh/roles`).

Example payload claim (dev signer):

```json
{
  "sub": "local-ci",
  "https://vaultmesh/roles": ["operator"]
}
```

Negative test (auditor → 403 on execute):

```bash
TOKEN_AUD=$(curl -s -X POST -H "content-type: application/json" \n  -d '{"sub":"aud","roles":["auditor"]}' \n  http://localhost:3000/v1/dev/token | jq -r .token)

curl -s -o /dev/null -w "%{http_code}\n" \n  -H "Authorization: Bearer $TOKEN_AUD" \n  http://localhost:3000/v1/api/execute   # 403
```


- <a href="docs/README_RUN_MODES.md">Run Modes</a> — how to run locally / in Replit (single-port, duo/HMR, smoke)
- <a href="docs/PROD_CHECKLIST.md">Production Checklist</a> — must-pass gates before prod rollout
- <a href="docs/OPERATIONS_RUNBOOK.md">Operations Runbook</a> — incident response playbooks

<br/>
→ <a href="docs/PROD_CHECKLIST.md">Production Checklist</a>
<br/>
→ <a href="docs/OPERATIONS_RUNBOOK.md">Operations Runbook</a>

→ See **[ARTIFACTS.md](./ARTIFACTS.md)** for how to interpret CI downloads (secrets/code review JSON, SBOM, etc.).

**North Star:** Position VaultMesh as Earth's Civilization Ledger — a living archive of law, memory, economy, and guardianship.

This repo is a minimal, sovereign **Prompt OS** that turns tiny commands into full operational scrolls.

## Quickstart

### One-command compliance demo
```bash
make demo-compliance
# -> builds repo, runs DORA ICT Risk + TPRM with sample evidence,
#    writes artifacts/demo/*.json, opens the live sales deck.
```
Artifacts: `artifacts/demo/ict_risk.report.json`, `artifacts/demo/tprm.report.json`.

```bash
# 1) Install deps
pnpm install

# 2) Set your OpenAI key (or use .env)
export OPENAI_API_KEY="sk-..."

# 3) Run: Recon (JSON)
pnpm forge tem-recon @blue --target acme.bank --depth deep --format json

# 4) Run: Fintech deck (Markdown)
pnpm forge deck-fintech @vault "Payments scale-up; ask: 10-day €12k sprint + €15–25k retainer"

# 5) Run: Guardrails check (Markdown)
pnpm forge tem-guardrails @blue \
  --agent "Ops Copilot" \
  --permissions_matrix "./examples/iso27001.yaml" \
  --data_access "crm,s3:reports"
```

> **Safety levels:** read-only (default), advisory, lab-only (pseudocode), restricted.
> No live payloads, no destructive steps, no secrets. Passive recon only unless lab gates are met.

### Codebase audit scroll

```bash
pnpm build
make audit-run
```

Artifacts are written to `artifacts/audit/audit_scroll.json` plus a timestamped copy for every run. The template will self-collect evidence if no bundle exists.

> **Provider note:** ensure one of `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, or `OLLAMA_HOST` is set (via `export` or `.env`) before running audits locally. Without a provider the CLI will abort once it reaches the model call.

Each run also anchors the scroll into `unforged_forge_genesis/` and emits `artifacts/audit/proof_bundle.json`. Verify locally:

```bash
node scripts/verify-proof.js artifacts/audit/proof_bundle.json
```

Merkle construction: leaves use `sha256(artifact_id)` and parents use `sha256(sorted(left||right))`, duplicating lone nodes for determinism.

To enforce gating locally, drop the advisory semantics:

```bash
make audit-run || echo "audit failed — inspect artifacts/audit"
```

> **Governance note:** CI automatically runs `evolve:verify` (advisory comment) on PRs that touch `catalog/**` or `unforged_forge_genesis/ore/**`. Merges to `main` that update the Ore will `evolve:apply` + `evolve:mint` (plus proof) and upload the receipts—advisory today; remove the advisory flags to gate.
> To enforce this constitutionally, mark the `template-evolution-apply-mint` job as a required branch check (`Settings → Branch protection → main`) and drop the advisory flags (`continue-on-error`, `|| true`).

### Template Index
After each evolution, the CI (and local `pnpm run evolution:index`) writes a deterministic index at `artifacts/evolution/template_index.json`.

- **What:** list of all catalog templates with `id`, `version`, file SHA-256, and last evolution receipt (if any).
- **Why:** Workbench/CLI can render the constitutional status of every template instantly.
- **How:** `scripts/template_index_build.mjs` is dependency-light, offline, and sorts output for reproducibility.

### Council Journal
Every evolution appends a signed, append-only line to `artifacts/evolution/template_journal.jsonl` via `scripts/journal_append.mjs` (CI and `pnpm run evolution:journal`). Each entry records proposal id, versions, repo hash, receipt SHA-256, and—if minted—the anchored artifact/proof root.

## Layout

```
/forge/
  catalog/
    tem/
      reconnaissance.yaml       # tem-recon
      guardrails-checker.yaml   # tem-guardrails
    deck/
      fintech-strike-deck.yaml  # deck-fintech
  dispatcher/
    router.ts
    expander.ts
    safety.ts
    ensureConforms.ts
  profiles/
    vault.yaml
    exec.yaml
    blue.yaml
  schemas/
    prompt.schema.json
    output.schema.json
  cli/
    forge.ts
  logs/                        # JSONL audit (runtime)
  examples/
    commands.md
    iso27001.yaml
```

## Notes

- **Profiles** merge voice + defaults (e.g., `@vault`, `@exec`, `@blue`).
- **Schema refs** use JSON Pointers into `schemas/output.schema.json` (e.g., `#/definitions/tem/recon`).
- **Dispatcher** validates inputs, expands prompts, runs safety preflight, calls the LLM, then validates outputs against the schema.
- **Auto-repair:** if the first model output violates the schema, a single repair pass is attempted.

— VaultMesh · Earth's Civilization Ledger


---

# Executive Summary

VaultMesh Forge has advanced to a credible **early production** footing. Core execution and ledger flows are solid; the BFF/frontend handshake is clean; and the dashboard exposes health, streaming, and live agent/stub state with typed, schema-validated responses. We added env-driven CORS, hardened SSE, a real catalog provider with pagination/filtering, compatibility shims to protect agents, Prometheus metrics, and typed routes for templates. The Guardian route is live with a robust stub → agent flip and gauges for dashboards.

Security posture is reinforced with **OIDC/JWT** verification (JWKS), a **declarative RBAC** matrix, security headers/CSP, and a **dev bypass** for local/Replit. Observability includes `/metrics` and status probes. Testing/CI are adequate but uneven across domains. **Net:** Forge is ready for controlled pilots with guardrails; production rollout is near once a handful of security, observability, and test gaps are closed.

**Overall Score:** 7/10

## 1) Architecture & Design (7.5/10)
**Strengths**
- Clear separation: BFF (Fastify), Frontend (Vite/React), CLI engine, catalog provider
- Env-driven configuration (CORS, paths, agent entry). ESM-safe paths and dev runner
- Compatibility shims align legacy agents to canonical APIs
- Strong typing at boundaries: shared types + Zod schemas

**Weaknesses**
- Catalog provider scans filesystem per request (needs caching/indexing)
- Schema validation applied selectively (expand beyond templates)

**Recs**
- Add in-memory cache (TTL) + on-disk index; lazy invalidate on file changes
- Extend Zod/type-provider to all `/v1/api/*`; unify error shapes

## 2) Security & Compliance (6.5/10)
**Strengths**
- OIDC/JWT via JWKS (aud/iss checks); dev bypass flag for local
- Declarative RBAC via YAML; role claims mapping; action-based checks
- Security headers + CSP via Helmet; “secrets broker” posture

**Weaknesses**
- Missing rate limits on chatty endpoints
- No signed admin actions or tamper-evident API audit logs
- TLS/HSTS left to the edge (no validation doc)

**Recs**
- Per-route rate limits + size limits (execute, guardian)
- Redacted audit logs for sensitive actions; optional Merkle anchoring
- Document TLS/HSTS; optional server-side HSTS when behind TLS

## 3) Reliability & Resilience (6/10)
**Strengths**
- Hardened SSE (headers + keepalive); guardian mode probe with TTL
- Graceful stub fallbacks keep UI operable
- Env-driven CORS; low-friction curl/Postman

**Weaknesses**
- No circuit breaker/backoff for downstreams
- Catalog reads synchronous; can block under load

**Recs**
- Add retry/backoff/timeouts; lightweight breaker
- Catalog indexing + response cache with ETag/conditional GET

## 4) Observability & Monitoring (5.5/10)
**Strengths**
- `/metrics` with guardian_mode gauge
- Health + guardian probes; useful headers (e.g., `x-guardian-mode`)
- Fastify structured logging

**Weaknesses**
- Limited metrics (no template_runs_total, ledger_events_total)
- No tracing/OTLP; no request correlation IDs

**Recs**
- Add counters/gauges/errors by route
- Request IDs + optional OTLP tracing flags

## 5) CI/CD & Testing (6/10)
**Strengths**
- Vitest + Python checks; typecheck; schema validation
- Lint/Prettier enforced in CI
- Smoke jobs: `/v1/health`, bypass smoke, tokened smoke (real JWT via JWKS)

**Weaknesses**
- Route/auth contract tests missing
- FE/BFF contract drift not guarded

**Recs**
- Fastify inject tests for templates/count/execute (happy/negative/auth)
- Contract tests for FE↔BFF using shared types

## 6) Performance & Scalability (6/10)
**Strengths**
- Fastify + SSE; cursor pagination in templates
- Stateless BFF, scales horizontally

**Weaknesses**
- On-demand catalog scan; no cache/index
- Potential SSE fan-out pressure; no concurrency caps

**Recs**
- Cache/index the catalog; ETag support
- Backoff/circuit breakers + concurrency bounds/queueing

---

# Run Modes

## Single-Port Preview (recommended; Replit-friendly)
Build frontend + BFF, then serve SPA **and** API from the BFF on one port.

```bash
make preview           # defaults PORT=3000; override with: PORT=8080 make preview
# Or without Make:
# npm run build:web:npm && npm run build:bff:npm && npm run start:bff:npm
# pnpm equivalent (when Corepack active):
# pnpm -w run build:web && pnpm -w run build:bff && pnpm -w run workbench:start
```

Check:
	•	/ – SPA
	•	/v1/health – health JSON
	•	/v1/tick/stream – SSE hello + tick

Dev Duo (HMR)

Run BFF and Vite separately with HMR.

```
make dev2
# prints:
# shell A: BFF_PORT=8787 make start-bff
# shell B: VITE_DEV_PORT=5173 <npm|pnpm> --prefix workbench/frontend run dev
```

Tip: If you hit EADDRINUSE, run `make kill` (kills stale BFF processes).

⸻

Smoke & Auth

Dev Bypass (no token)

```
make smoke                   # AUTH_DEV_BYPASS=1; runs scripts/smoke-workbench.sh
```

Tokened Smoke (real JWT via JWKS)

Uses an env-gated dev signer (RS256) to issue a short-lived JWT; BFF verifies via JWKS.

```
make tokened-smoke           # AUTH_DEV_SIGNER=1; mints token; runs smoke with AUTH_HEADER
```

Env summary
	•	AUTH_DEV_BYPASS=1 – local/replit bypass (dev only)
	•	AUTH_DEV_SIGNER=1 – expose /dev/jwks.json + /v1/dev/token (dev/CI)
	•	OIDC_ISSUER, OIDC_AUDIENCE, OIDC_JWKS_URL – OIDC/JWKS verification
	•	AI_CORE_MODE=mock|live – LLM mode
	•	VMESH_RBAC_PATH – RBAC matrix (roles → actions)

### Docs Links (internal vs external)

You can toggle whether the **Docs** link in the header points to:

- Internal: served by the BFF at `/docs/OPENAPI.md`
  ```bash
  make docs:internal-preview    # single-port
  make docs:internal-dev        # duo; two-shell instructions
  ```

- External: an external URL (e.g., GitHub Pages or Confluence)
  ```bash
  make docs:external DOCS_URL=https://mydomain/docs    # single-port
  make docs:external-dev DOCS_URL=https://mydomain/docs  # duo; two-shell instructions
  ```

Notes
- The API link (/v1/openapi.json) appears when import.meta.env.DEV or VITE_EXPOSE_OPENAPI=1; the server route is gated by EXPOSE_OPENAPI=1 (or dev).
- The Docs link appears when VITE_EXPOSE_DOCS=1. By default it points to /docs/OPENAPI.md; override with VITE_DOCS_URL=<absolute URL>.
- For internal docs, set EXPOSE_DOCS=1 on the BFF to serve /docs/*.

See also: docs/INDEX.md#run-modes-shortcuts-makefile

⸻

## 🐳 Docker (GHCR)

Pull and run the latest image:

```bash
docker pull ghcr.io/vaultsovereign/forge:latest
docker run --rm -p 3000:3000 ghcr.io/vaultsovereign/forge:latest
# open http://localhost:3000/v1/health
```

Tags
- :latest — built from main
- :vX.Y.Z — release tags
- :<git-sha> — every push

Private registry? Authenticate once: `docker login ghcr.io` (use a PAT with `read:packages`).
The app ships multi-arch (amd64 + arm64); Docker will pull the right variant for your platform.

⸻
⸻

Makefile Targets

Target	What it does
make preview	Build FE+BFF and serve SPA+API on PORT (single-port)
make dev2	Prints duo instructions (keeps your existing make dev intact)
make start-bff	Start BFF only on BFF_PORT
make build-all	Build frontend + BFF
make kill	Kill stale BFF processes (fixes EADDRINUSE)
make smoke	Bypass smoke (AUTH_DEV_BYPASS=1)
make tokened-smoke	Tokened smoke (dev signer + real JWT verify via JWKS)
make env	Show selected toolchain and versions (npm/pnpm autodetect)

The Makefile auto-selects pnpm if available, otherwise falls back to npm.

⸻

CI Signals
	•	workbench-smoke – builds + curls /v1/health (required)
	•	smoke script (auth-dev-bypass) – runs local smoke with bypass
	•	smoke script (tokened auth) – spins dev signer, mints JWT, verifies via JWKS, runs smoke
	•	lint & format – ESLint + Prettier gates
	•	OpenAPI sanity – generate and validate docs/openapi/workbench.(yaml|json)

⸻

Pilot Readiness
	•	Disable AUTH_DEV_BYPASS and run tokened smoke
	•	Monitor /metrics (guardian_mode, add template/ledger counters soon)
	•	Ensure CORE_GRPC_ADDR is set in production
	•	Guardian must be agent in prod; stub returns 503

With these guardrails active, Forge is ready for controlled pilots. Address rate limiting, catalog caching, and contract tests before broader rollout.

---

---

[🔝 Back to top](#readme)
