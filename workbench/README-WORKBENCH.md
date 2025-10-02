# VaultMesh Visual Workbench — Skeleton

The Workbench pairs a Fastify Backend-for-Frontend (BFF) with a Vite + React SPA. It ships runnable stubs today and is wired for future OIDC + gRPC integration.

## Dev Workflow

### Backend (BFF)
```bash
cd workbench/bff
cp .env.example .env
pnpm install || npm install
pnpm dev || npm run dev
# -> http://localhost:8787/v1/api/health
```

### Frontend (SPA)
```bash
cd workbench/frontend
pnpm install || npm install
pnpm dev || npm run dev
# -> http://localhost:5173
```

Set `VITE_API_BASE=http://localhost:8787` so the SPA targets the running BFF.

## Docker
```bash
cd workbench
docker build -t vaultmesh/workbench:dev .
docker run -p 8787:8787 vaultmesh/workbench:dev
# SPA assets served from /public; BFF exposed on :8787
```

## Notes
- Auth: `AUTH_DEV_BYPASS=1` bypass in dev; wire real OIDC in `src/auth/oidc.ts` when ready.
- Secrets: `src/core/secrets.ts` reads environment vars today; swap to Vault/KMS provider for prod.
- Core: `src/core/client.ts` simulates dispatcher + ledger; set `CORE_GRPC_ADDR` once the gRPC service ships.
- Streaming: `/v1/api/execute/stream` uses Server-Sent Events for log delivery.

## Roadmap Hooks
- Add Monaco + JSON Schema editing in the Templates section.
- Implement gRPC clients for execute + ledger query.
- Harden RBAC by sourcing roles from verified JWT claims.
- Serve SPA statics via Fastify or bundle with an edge CDN.
