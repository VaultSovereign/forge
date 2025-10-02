# Run Modes

This guide covers local development workflows for VaultMesh Forge.

## Single-Port Preview (recommended)

Build the frontend + BFF, then serve SPA and API from one port.

```bash
make preview           # defaults PORT=3000; override: PORT=8080 make preview
# Or with pnpm:
pnpm run build:web && pnpm run build:bff && pnpm run workbench:start
```

Check:

- / — SPA
- /v1/health — health JSON
- /v1/tick/stream — SSE hello + tick

## Dev Duo (HMR)

Run BFF and Vite separately with hot reloading.

```bash
make dev2
# prints:
# shell A: BFF_PORT=8787 make start-bff
# shell B: VITE_DEV_PORT=5173 pnpm --prefix workbench/frontend run dev
```

Or use the unified dev command:

```bash
pnpm dev              # runs both BFF and frontend concurrently
```

Tip: if you hit EADDRINUSE, run `make kill` to clear stale BFF processes.

## Smoke & Auth

Dev Bypass (no token):

```bash
make smoke    # AUTH_DEV_BYPASS=1; runs scripts/smoke-workbench.sh
```

Tokened Smoke (JWT via JWKS, prod-like):

```bash
make tokened-smoke    # AUTH_DEV_SIGNER=1; mints JWT; runs smoke with AUTH_HEADER
```

## Vite Config Notes

- Proxies /v1, /guardian, /metrics to the BFF using `BFF_PORT`.

## Common Issues

- EADDRINUSE on 8787 → `make kill` or choose a new `BFF_PORT`.
- pnpm not active → enable Corepack: `corepack enable && corepack prepare pnpm@10.17.0 --activate`.
