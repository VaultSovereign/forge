# VaultMesh Visual Workbench Architecture

## Intent
The VaultMesh Visual Workbench is the sovereign, auditable interface for exploring and operating the Civilization Ledger. It extends the existing CLI, dispatcher, and Reality Ledger with a visual layer without weakening guardrails.

## Guiding Philosophy
- Sovereign by Design: Ship as a self-hostable bundle that runs on the operator's infrastructure (Docker / Helm first-class).
- Security as a Feature: All actions traverse existing guardrails; no direct LLM calls from the browser; everything is authenticated and logged.
- Verifiability at a Glance: Ledger events remain the source of truth and are surfaced in UX primitives (dashboards, drill-downs, exports).
- Seamless Extensibility: Prompt authors can create, lint, diff, and publish templates through the Workbench with guardrails identical to the CLI.

## Reference Architecture
```
+-------------------------------+
|        Browser (SPA)          |
|  React + Vite + TS + Zustand  |
+---------------+---------------+
                | HTTPS / WSS / SSE
                v
+---------------+---------------+
|  Workbench BFF (Node, Fastify)|
|  - AuthZ/OIDC Middleware      |
|  - RBAC Policy Engine         |
|  - Secrets Broker             |
|  - API v1 (REST + SSE)        |
+---------------+---------------+
                | gRPC / IPC
                v
+---------------+---------------+
|  VaultMesh Core Library       |
|  (Dispatcher, Reality Ledger) |
|  + Event Hook Bus             |
+---------------+---------------+
                | outbound HTTPS
                v
+---------------+---------------+
|  LLM Providers (OpenRouter,   |
|  OpenAI, Ollama, ... )        |
+-------------------------------+
```

## Component Responsibilities
**Workbench Frontend**
- SPA built with React, Vite, and TypeScript; uses Radix UI + Tailwind for accessibility-first design.
- Monaco-based editor for YAML templates with inline schema linting using `prompt.schema.json`.
- JSON Schema driven form renderer (`@rjsf/core`) auto-builds execution forms from template inputs.
- WebSocket for command initiation, Server-Sent Events for log streaming to simplify proxying and auditing.
- Local-only persistence (IndexedDB) for drafts; never stores secrets.

**Workbench BFF**
- Fastify + TypeScript server compiled in build stage.
- Auth: integrates with OIDC/OAuth2 providers; issues signed JWT session cookies; RBAC derived from ID token claims.
- Secrets: pulls provider tokens from environment or vault drivers (HashiCorp Vault, AWS Secrets Manager); never returns them to frontend.
- API: exposes `/v1/*` REST endpoints plus `/v1/exec/stream` SSE; enforces schema validation using Zod.
- Observability: ships structured logs to Reality Ledger (attempt + completion) and emits metrics via OpenTelemetry exporters.

**VaultMesh Core Library**
- Dispatcher and Reality Ledger repackaged as `@vaultmesh/ai-core` Node library for clean consumption (no CLI shelling).
- Provides composable services: `runKeyword`, `runTemplate`, `queryLedger`, `subscribeLedger`.
- Event hook system publishes ledger writes to the BFF for real-time updates.

**Reality Ledger Visualizer**
- Data grid with cursor pagination, column filters, hash verification, CSV/JSON export.
- Drill-down pane renders full artifact, content hash, and verification status; exposes "verify locally" command snippet.

## Key User Flows
**Dashboard**
1. Frontend requests `/v1/ledger/stats` and `/v1/templates/recent` on load.
2. BFF caches frequent stats (60s) to avoid hammering ledger files.
3. If anomalies detected (failed runs spike), front-end surfaces alerts.

**Template Explorer & Editor**
1. `/v1/templates?cursor=...` fetches catalog metadata from disk.
2. Selecting a template calls `/v1/templates/{id}` returning YAML, schema, version metadata.
3. Editing triggers lint via in-browser worker referencing `prompt.schema.json` + CLI rules.
4. Saving issues `PATCH /v1/templates/{id}`; BFF validates, writes to git-tracked catalog, emits ledger entry.

**Execution Console**
1. User submits form; BFF validates payload and RBAC.
2. Execution initiated via `runTemplate` call; SSE stream returns phased updates (queued, running, LLM call, ledger write).
3. Final payload includes ledger event id and signature; UI links directly into Visualizer.

**Ledger Visualizer**
1. `/v1/ledger/events?cursor=` supports deterministic pagination (timestamp + seq).
2. Users can filter by template, profile, date range, status, actor; queries use index files for speed.
3. "Export" triggers offline artifact packaging via `/v1/ledger/events/{id}/export`.

## Security & Compliance
- Identity: rely on external IdP (Azure AD, Okta, Auth0). Mandatory MFA enforced upstream; BFF verifies signature, expiration, and audience.
- RBAC: policy matrix stored in `config/rbac.yaml`; roles: operator, auditor, template-author. Policies enforced before invoking dispatcher.
- Transport: TLS termination via reverse proxy (NGINX, Traefik). Internal gRPC protected with mTLS certificates managed by platform.
- Secrets: BFF uses provider-agnostic secrets interface (`providers/secrets/{env,vault,kms}.ts`). Refresh on demand, cache in-memory only.
- Audit: every request generates `attempt` ledger entry (even if it fails). Ledger vendor-neutral export (JSON Lines, CSV).
- Hardening: enable Content Security Policy, HTTP security headers, OAuth PKCE; adopt dependency scanning (pnpm audit, OWASP Dependency-Check).

## API Surface (v1)
| Endpoint | Method | Purpose | Notes |
| --- | --- | --- | --- |
| `/v1/login` | POST | Exchange OIDC code for session | optional when behind corporate SSO |
| `/v1/templates` | GET | List templates (paginated) | includes version metadata |
| `/v1/templates/{id}` | GET | Fetch template YAML + schema | returns signed checksum |
| `/v1/templates` | POST | Create new template | requires `template-author` role |
| `/v1/templates/{id}` | PATCH | Update existing template | emits ledger diff entry |
| `/v1/templates/{id}` | DELETE | Soft-delete template | marks inactive, keeps history |
| `/v1/execute` | POST | Kick off execution | returns execution id |
| `/v1/execute/{id}` | GET | Fetch execution summary | polling fallback |
| `/v1/execute/{id}/stream` | GET (SSE) | Live log / output stream | emits structured JSON events |
| `/v1/ledger/events` | GET | Query ledger events | supports cursor + filters |
| `/v1/ledger/events/{eventId}` | GET | Event detail | includes verification fields |
| `/v1/ledger/stats` | GET | Dashboard metrics | caches per minute |
| `/v1/health` | GET | Liveness/readiness | consumed by orchestrators |

## Deployment & Operations
- **Build pipeline**: Multi-stage Dockerfile
  1. `frontend-builder`: pnpm install + `pnpm run build:web` producing `/app/frontend` assets.
  2. `backend-builder`: pnpm install (workspace), compile BFF + `@vaultmesh/ai-core` to `/app/dist`.
  3. `runtime`: distroless Node (or Alpine) image containing BFF, static assets, core library, schemas, catalogs.
- **Runtime composition**: Serve SPA through Fastify static plugin or sidecar NGINX. BFF proxies `/v1/*` while serving `/` -> index.html.
- **Configuration**: Environment variables + mounted config maps. Mirror CLI env names (`OPENROUTER_API_KEY`, etc.) plus OIDC settings (`OIDC_ISSUER`, `OIDC_CLIENT_ID`).
- **Observability**: Centralize logs to `artifacts/` and ship to SIEM; expose metrics on `/metrics`; integrate traces via OTLP.
- **Scaling knobs**: Recommend Helm chart with separate deployments: `workbench-frontend`, `workbench-bff`, `vaultmesh-core`. Default Docker compose keeps single-container developer experience.
- **CI/CD alignment**: Extend `scripts/forge-prepush.sh` with `pnpm run lint:web`, `pnpm run test:web`, and Workbench build job; publish image via GitHub Actions.

## Status Assessment
**Established (Done today)**
- Dispatcher and Reality Ledger already exist and expose functions alignable with `runTemplate` and `queryLedger`.
- Catalog structure, schemas, and guardrails (safety, validation) are production-ready and reusable by the Workbench.
- Forge pre-push pipeline enforces typecheck, lint, tests, build, security scans to extend for Workbench code.

**Outstanding (Requires implementation)**
- Packaging dispatcher + ledger as consumable library (`@vaultmesh/ai-core`).
- Designing and implementing Fastify-based BFF with OIDC, RBAC, secrets broker, and API surface defined above.
- Building React/Vite SPA (pages, Monaco editor, schema-driven forms, SSE handling, ledger visualizer UI).
- Establishing real-time streaming (SSE + optional WebSocket) wiring between BFF and frontend.
- Creating event hook bus within Reality Ledger for push updates and consistent audit emissions.
- Extending deployment artifacts (Dockerfile, Helm chart, GitHub Actions) to build and ship Workbench image(s).
- Documenting security guarantees, audit story, and extensibility model for third-party reviewers.

## Implementation Roadmap
1. **Core refactor**: Extract dispatcher + ledger into shared Node package; publish internally.
2. **API contract**: Define protobuf (for gRPC) and TypeScript types; add `/v1` OpenAPI spec in `docs/api/workbench-openapi.yaml`.
3. **BFF scaffolding**: Create Fastify service with auth, RBAC, secrets providers, health endpoints.
4. **Frontend foundation**: Scaffold Vite app, routing, layout, shared design system, telemetry.
5. **Template workflows**: Monaco editor integration, schema-driven forms, diffing, server PATCH flow.
6. **Execution streaming**: Implement SSE pipeline, log hydration, ledger linkbacks.
7. **Ledger visualizer**: Data grid, filters, export, verification workflow.
8. **Security & compliance**: Harden headers, CSP, add automated dependency + container scans to CI.
9. **Ops & release**: Multi-stage Docker, compose + Helm samples, GitHub Actions publish, documentation updates.

## Audit & Documentation Additions
- Author `docs/workbench-security.md` summarizing guardrails, audit guarantees, and external auditor workflow.
- Update `ARTIFACTS.md` with new artifacts generated by Workbench (execution run bundles, CSV exports).
- Add `docs/openapi/workbench.yaml` to track API evolution; run spectral lint in CI.

This document replaces the previous draft and reflects the current consensus design alongside explicit TODOs required to render the Workbench production-ready.

## Replit Forge — Single‑Click Dev Environment

**Why Replit here?** Fast iterative UX work, shareable previews, and a disposable sandbox that doesn’t dilute VaultMesh’s guardrails. We develop UI + BFF on Replit, keep secrets in Replit’s Secrets vault, and point at a non‑prod LLM proxy (or mock) while preserving proof‑first flows.

### What we’ll run on Replit
- **Workbench BFF** (Fastify) binding to `process.env.PORT` (Replit allocates this dynamically)
- **Frontend (Vite)** served by the BFF as static assets in prod build; during dev we use Vite with a proxy to the BFF
- **@vaultmesh/ai-core (shim)** — mocked adapters by default; can switch to real providers by setting secrets

### Repo expectations
```
workbench/
  bff/                 # Fastify service (TypeScript)
  frontend/            # React + Vite + TS
  ai-core/             # Node lib facade (dispatcher + ledger adapters)
replit.nix             # Nix environment for pnpm + node
.replit                # (classic) run command (optional)
replit.yaml            # (new) run + env + services (preferred)
```

> If these files don’t exist yet, create them with the snippets below. They’re development‑only and safe to commit.

### `replit.nix`
```nix
{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.nodePackages.pnpm
    pkgs.git
    pkgs.cacert
  ];
}
```

### `replit.yaml` (preferred)
```yaml
# Replit’s newer config format
run:
  steps:
    - pnpm install --frozen-lockfile=false
    - pnpm -w run build:web  # builds frontend
    - pnpm -w run build:bff  # builds backend
    - node workbench/bff/dist/server.js

# Expose the single web server (Fastify) listening on $PORT
services:
  web:
    env:
      NODE_ENV: development
      PORT: 3000
      LOG_LEVEL: info
      # OIDC/LLM secrets are provided via the Replit Secrets UI; see list below.
```

### `.replit` (legacy, optional)
```toml
run = "pnpm install && pnpm -w run dev"
lang = "nodejs"
```

### Frontend dev settings (Vite)
Add (or ensure) the following in `workbench/frontend/vite.config.ts` so the dev server binds externally and proxies API calls to the BFF:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,              // 0.0.0.0 for Replit
    port: 5173,
    strictPort: false,
    proxy: {
      '/v1': {
        target: `http://127.0.0.1:${process.env.PORT || 3000}`,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
  },
})
```

### Fastify BFF server (bind to `$PORT`)
Ensure the BFF chooses Replit’s port and serves the SPA in production builds:
```ts
// workbench/bff/src/server.ts
import fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import path from 'node:path'

const app = fastify({ logger: true })
const PORT = Number(process.env.PORT || 3000)

// API routes (example)
app.get('/v1/health', async () => ({ ok: true }))

// In production, serve built frontend
if (process.env.NODE_ENV !== 'development') {
  const distDir = path.join(__dirname, '../../frontend-dist')
  await app.register(fastifyStatic, { root: distDir, prefix: '/' })
}

app.listen({ host: '0.0.0.0', port: PORT })
  .then(addr => app.log.info({ addr }, 'BFF up'))
  .catch(err => { app.log.error(err); process.exit(1) })
```

### Workspace scripts (root `package.json`)
Add scripts to orchestrate dev/prod locally and on Replit:
```json
{
  "scripts": {
    "build:web": "pnpm --prefix workbench/frontend run build && cp -r workbench/frontend/dist workbench/frontend-dist",
    "build:bff": "pnpm --prefix workbench/bff run build",
    "dev": "concurrently -k \"pnpm --prefix workbench/bff run dev\" \"pnpm --prefix workbench/frontend run dev\"",
    "start": "node workbench/bff/dist/server.js"
  },
  "devDependencies": {
    "concurrently": "^9.0.0"
  }
}
```

### BFF `package.json`
```json
{
  "type": "module",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc -p tsconfig.json"
  },
  "dependencies": {
    "fastify": "^4.28.1",
    "@fastify/static": "^7.0.1"
  },
  "devDependencies": {
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.6.3"
  }
}
```

### Frontend `package.json`
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  }
}
```

### Secrets on Replit
Set these in the **Secrets** panel (never commit):
- `OPENROUTER_API_KEY` (or `OPENAI_API_KEY`, or point to Ollama via gateway URL)
- `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_AUDIENCE` (optional in dev)
- `VMESH_RBAC_PATH` (optional; path to checked‑in `config/rbac.yaml`)
- `AI_CORE_MODE` = `mock` | `live` (default `mock` for safe dev)

### First‑boot Ritual (Dev)
1. Open the Replit ➜ Shell: `pnpm -w install`
2. Run dev duo: `pnpm -w run dev`
3. Replit will show a web preview; navigate to `/` for the SPA, hit `/v1/health` for API check.
4. Flip `AI_CORE_MODE` to `live` only when you’ve set provider keys and are comfortable with receipts.

### Proof & Guardrails on Replit
- **Receipts**: write to `artifacts/` in the workspace; expose a **Download Bundle** button in the UI (dev‑only).
- **No browser LLM calls**: all LLM traffic funnels through BFF just like prod.
- **Mock mode default**: templates execute with deterministic fixtures; ledger entries are marked `simulated=true` to avoid provenance confusion.

### CI Alignment
Replit is a dev convenience. The canonical build still runs in CI with the same commands:
```bash
pnpm -w run build:web && pnpm -w run build:bff && pnpm -w run workbench:start
```

---

**Operator Note:** Replit previews run behind a single `$PORT`. In dev we run Vite + BFF separately; for production preview, prefer `pnpm -w run build:web && pnpm -w run build:bff && pnpm -w run workbench:start` so Fastify serves the built SPA and the preview uses one port.
