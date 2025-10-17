# VaultMesh Forge

Sovereign prompt orchestration for compliance and cybersecurity — short, focused README with links to full docs.

[CI](.github/workflows/ci.yml) · [Releases](https://github.com/VaultSovereign/vm-forge/releases) · [Docs Index](https://doc.vaultmesh.org/) · [OpenAPI](docs/OPENAPI.md)

## Quickstart

Prereqs: Node 22, pnpm 10.17+

Install, build, test:

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm test
```

Workbench (BFF + Frontend):

```bash
# Dev (HMR, two processes)
pnpm run dev

# Prod-like single port
cp .env.example .env  # optional
pnpm run build
pnpm run workbench:start
```

Tip: `workbench:start` builds agents automatically if `agents/build/index.js` is missing. The BFF loads the Guardian agent from `GUARDIAN_AGENT_ENTRY` (default: `agents/build/index.js`).

## API

- OpenAPI JSON: `GET /v1/openapi.json`
- Human docs: see `docs/OPENAPI.md` (generated)

Minimal check (default port 3000):

```bash
curl -fsS http://127.0.0.1:3000/v1/openapi.json | jq '.info'
```

Authenticated execute (dev signer):

```bash
# Mint a dev token (operator role)
TOKEN=$(curl -s -X POST -H 'content-type: application/json' \
  -d '{"sub":"local-ci","roles":["operator"]}' \
  http://localhost:3000/v1/dev/token | jq -r .token)

# Execute a template (REST)
curl -s -X POST \
  -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"templateId":"demo.echo","profile":"vault","args":{"msg":"hello"}}' \
  http://localhost:3000/v1/api/execute | jq .

# Stream events (SSE)
curl -Ns "http://localhost:3000/v1/api/execute/stream?templateId=demo.echo&profile=vault&args=%7B%22msg%22%3A%22hello%22%7D"
```

## Docker (GHCR)

```bash
docker pull ghcr.io/vaultsovereign/forge:latest
docker run --rm -p 3000:3000 ghcr.io/vaultsovereign/forge:latest
```

## CI & Gates

- Node 22 pinned in CI. Lockfile is tracked.
- Pre-push gates run in CI. Without provider keys, CI auto-sets `FORGE_SKIP_REMOTE_SCANS=1`.
  - Local: `FORGE_SKIP_REMOTE_SCANS=1 make forge-prepush`

## Contributing

See `CONTRIBUTING.md`, `AGENTS.md`, and `docs/` for full guides and run modes.
