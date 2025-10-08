# Secure BFF (Port 8787)

This variant hardens the Forge BFF with a shared-secret header check, a tiny in-memory
rate limiter, and configurable CORS allowlists. Use it when exposing the operator
surface beyond localhost or when you need quick guardrails without a dedicated edge proxy.

## Usage

```bash
export FORGE_BFF_SECRET="change-me-please"
export FORGE_CORS_ORIGINS="http://localhost:5173,http://localhost:8787"
export FORGE_RATE_CAP=60
export FORGE_RATE_BURST=30

node workbench/bff/src/server.port8787.secure.ts
```

### Calling the protected SSE endpoint

```bash
curl -N "http://localhost:8787/v3/run/stream?keyword=guardrails-check&args={\"templateYaml\":\"id:x\\nversion:1.0.0\\nkeyword:test\\ninputs:[]\\nprompts:{system:\\\"ok\\\",user:\\\"hi\\\"}\"}" \
  -H "x-forge-secret: ${FORGE_BFF_SECRET}"
```

If `FORGE_BFF_SECRET` is unset, the middleware allows the request but returns
an `x-forge-warning` header so you know the guard is disabled (useful during
local prototyping).

## Environment knobs

| Variable             | Description                                     | Default |
| -------------------- | ----------------------------------------------- | ------- |
| `FORGE_BFF_SECRET`   | Shared secret required via `x-forge-secret`      | `""` (disabled) |
| `FORGE_CORS_ORIGINS` | Comma-separated allowlist or `*` for any origin  | `*`     |
| `FORGE_RATE_CAP`     | Token refill per minute (per IP)                 | `60`    |
| `FORGE_RATE_BURST`   | Initial bucket size (per IP)                     | `30`    |

## Notes

- The rate limiter keeps state in-memory; for multi-instance deployments use a
  dedicated gateway or distributed limiter.
- CORS allowlist accepts absolute origins. Set to `*` while iterating locally.
- The server sets `trustProxy: true` so rate limiting works correctly behind
  reverse proxies that forward the client IP.
