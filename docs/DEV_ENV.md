# DEV_ENV — Portal Dashboard (Local Development)

## Package Manager

- Canonical: `pnpm` (activated via Corepack)
- Engine strict enforcement v## 4) Set required env

In your local `.env` file:

- `OPENAI_API_KEY=<your key>` ← required by `@openai/agents`
- Frontend already uses `VITE_API_BASE=http://localhost:8787`
- CORS already handled via `ALLOWED_ORIGINS` (dev example: `http://localhost:5000,http://127.0.0.1:5000`)

## 5) Quick switch-on test

Build, run, and verify "agent" mode appears:

### Rules

- Do not commit `package-lock.json` or `node_modules/`.
- Keep `pnpm-lock.yaml` authoritative for CI.
- Use `pnpm install --frozen-lockfile` for reproducible builds.

## Services & Ports

- Frontend (Vite): `http://localhost:5000`
- BFF (Fastify): `http://localhost:8787`

## Environment

- `VITE_API_BASE=http://localhost:8787`
- `ALLOWED_ORIGINS=http://localhost:5000,http://127.0.0.1:5000`
- `OPENAI_API_KEY=<required if Agent route is enabled>`

## Dev Scripts

- BFF: `npm run dev` → `tsx watch src/server.ts`
- Frontend: `npm run dev` → `vite --port 5000`
- Typecheck: `npm run typecheck` (BFF only)
- Build (prod): `npm run build` then `npm start` (BFF uses `dist/`)

## SSE Notes

- Endpoint: `/v1/tick/stream`
- Headers: `text/event-stream`, `no-cache`, `keep-alive`, `X-Accel-Buffering: no`
- CORS mirrors `ALLOWED_ORIGINS`. Frontend badge shows green when stream is open.

## Guardian Mode Probe

- `GET /v1/guardian/mode` → `{ mode: 'stub' | 'agent' | 'unknown', ts }`
- Used by the dashboard to show a live Agent/Stub status chip
- Also available: `HEAD /v1/guardian/mode` (header-only; 204)
- Headers: `x-guardian-mode: agent|stub|unknown`, `ETag: W/"<mode>-<tsSec>"`, `Cache-Control: no-cache`
- Env (optional): `GUARDIAN_AGENT_ENTRY` (absolute/relative entry override), `GUARDIAN_MODE_TTL_MS` (cache TTL, default 1000ms)

## Metrics (Prometheus)

- `GET /metrics` (text/plain, Prometheus exposition)
- Gauges:
  - `guardian_mode{mode="agent|stub|unknown"}` → one-hot 0/1 for current mode
- Makefile: `make curl:metrics`

### Template Catalog

- Root: `catalog/` (override with `VM_CATALOG_ROOT`)
- Endpoints:
  - `GET /v1/api/templates?limit=&cursor=&filter=` → array of `{ id, name, description }` (headers: `x-total-count`, `x-next-cursor`)
  - `GET /v1/api/templates/count?filter=` → `{ total }`
- Behavior:
  - Filter matches `id|name|tags` (case-insensitive)
  - Pagination is cursor-based (opaque sha1 of last id)
- Shims (legacy agent compatibility):
  - `GET /templates` → `/v1/api/templates`
  - `GET /ledger` → `/v1/api/ledger/events`
  - `POST /run/:id` → `/v1/api/execute`

### Frontend Live Count

- Hook: `useTemplateCount(filter?)` fetches `/v1/api/templates/count` and surfaces `{ count, loading, error }`.
- Recommended for Overview to display a real-time templates total without parsing headers.

## Quick Smoke

```bash
curl -s http://localhost:8787/v1/health
curl -s http://localhost:8787/v1/api/templates
curl -i -H "Origin: http://localhost:5000" http://localhost:8787/v1/api/templates | sed -n '1,10p'
curl -N http://localhost:8787/v1/tick/stream | head -n 5
```

---

# VaultMesh Agent Loader — from Stub to Agent

What this does

Turns `/guardian/ask` from stub mode into agent mode by compiling `agents/index.ts` and setting the required env.

## 1) Install agent deps

From repo root:

```bash
npm i @openai/agents zod
```

## 2) Build the Agent (tsup, clean & simple)

Add tsup (bundles TS → a single ESM file):

```bash
npm i -D tsup
```

Create a script in `package.json` (root):

```json
{
  "scripts": {
    "build:agents": "tsup agents/index.ts --format esm --target node20 --dts=false --splitting=false --out-dir agents/build --clean"
  }
}
```

Build:

```bash
npm run build:agents
# => emits agents/build/index.js
```

## 3) Point the BFF at the built file

Update the dynamic import in the Guardian route to prefer the built JS:

`workbench/bff/src/routes/guardian.ts`

```ts
async function resolveAgent() {
  try {
    // Prefer built artifact (agents/build/index.js)
    const mod = await import('../../../agents/build/index.js');
    return typeof (mod as any).askGuardian === 'function' ? (mod as any).askGuardian : null;
  } catch {
    // Fallback: if you sometimes run with raw TS + tsx, you can optionally try the TS path:
    // const mod = await import('../../../agents/index.ts');
    // return typeof (mod as any).askGuardian === 'function' ? (mod as any).askGuardian : null;
    return null;
  }
}
```

No other server changes needed. Your existing `/guardian/ask` logic already auto-upgrades from stub → agent when `askGuardian` resolves.

## 4) Set required env

In Replit Secrets (and locally):

- `OPENAI_API_KEY=<your key>` ← required by `@openai/agents`
- Frontend already uses `VITE_API_BASE=http://localhost:8787`
- CORS already handled via `ALLOWED_ORIGINS` (dev example: `http://localhost:5000,http://127.0.0.1:5000`)

## 5) Quick switch-on test

Build, run, and verify “agent” mode appears:

```bash
# Build the agent bundle
npm run build:agents

# Start services
cd workbench/bff && npm run dev
# (new tab)
cd workbench/frontend && npm run dev

# Ask the Guardian (should return mode: "agent")
curl -s http://localhost:8787/guardian/ask \
  -H 'content-type: application/json' \
  -d '{"input":"List 5 latest ledger events; flag non-ok"}' | jq
# => { "text": "...", "events": [...], "mode": "agent" }
```

In the UI, the Guardian Console panel will now show real agent output; mode flips from "stub" to "agent".

## Troubleshooting (fast)

- 401 / 429 from OpenAI → Check `OPENAI_API_KEY`, quota, or org policy.
- `ERR_MODULE_NOT_FOUND '../../../agents/build/index.js'` → Run `npm run build:agents` again; ensure the output path matches the import.
- CORS on `/guardian/ask` → `ALLOWED_ORIGINS` must include your frontend origin (`http://localhost:5000`).
- Still stub mode → The route couldn’t import `askGuardian`. Confirm the file exists at `agents/build/index.js` and exports `askGuardian`.

## (Optional) CI step

If you want CI to package the Agent:

```json
{
  "scripts": {
    "ci:build": "npm run build:agents && npm --prefix workbench/bff run build && npm --prefix workbench/frontend run build"
  }
}
```
