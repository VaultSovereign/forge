# VaultMesh 

<p align="center">
  <a href="docs/INDEX.md">
    <img src="https://img.shields.io/badge/📚_Docs-Index-blue?style=for-the-badge" alt="Docs Index">
  </a>
  <a href="docs/CIVILIZATION_COVENANT.md">
    <img src="https://img.shields.io/badge/📜_Covenant-Constitution-gold?style=for-the-badge" alt="Covenant">
  </a>
  <a href="docs/VaultMesh_Mandala.svg">
    <img src="https://img.shields.io/badge/🌀_Mandala-Interactive-purple?style=for-the-badge" alt="Mandala">
  </a>
</p>

**Steel sung — the Polis awakens.**

Sovereign prompt orchestration for compliance and cybersecurity.  
Not a product, but a **Polis** — a civilization ledger, a guardian wall, a living forge.

<p align="center">⚔️</p>

## ⚖️ The Covenant

**→ [CIVILIZATION_COVENANT.md](docs/CIVILIZATION_COVENANT.md)** — The living constitution of the Polis

Before deploying, before commands, read the covenant. It binds citizens and guardians by proofs, receipts, and fire.

<p align="center">
  <img src="docs/VaultMesh_Mandala.svg" alt="VaultMesh Mandala — Five Pillars of the Polis" width="600">
</p>

**Open interactive:** [docs/VaultMesh_Mandala.svg](docs/VaultMesh_Mandala.svg) — Click pillars to jump to Sacred Texts

**→ [📚 Full Docs Index](docs/INDEX.md)** — Master scroll library: Operations, Security, Mandala, Dev guides

<p align="center">🜞 🜞 🜞</p>

## 📚 The Sacred Texts

<p align="center"><sub>⚔️ Inner Threshold ⚔️</sub></p>
<p align="center"><sub>
Beyond the threshold lie the scrolls of the Polis. <br>
Choose your gate — Docs Index, Covenant, or Mandala — <br>
and the full library unfolds.
</sub></p>


| Symbol | Scroll | Purpose |
|-------|--------|---------|
| ⚖️ | [CIVILIZATION_COVENANT.md](docs/CIVILIZATION_COVENANT.md) | Living constitution, pillars, rights, creed |
| 🜔 | [VaultMesh_Mandala.svg](docs/VaultMesh_Mandala.svg) | Interactive mandala (visual architecture) |
| 🜄 | [QUICKSTART.md](docs/QUICKSTART.md) | Installation, first drill, local dev |
| ⚔️ | [OPERATIONS.md](ai-companion-proxy-starter/OPERATIONS.md) | Operator quick reference |
| 🜞 | [RECEIPTS.md](docs/RECEIPTS.md) | Receipt schema, verification, Merkle rollup |
| 🜏 | [GUARDIAN_ALERTING.md](docs/GUARDIAN_ALERTING.md) | Slack Block Kit, rate limiting, testing |
| ⚖️ | [INDEX.md](docs/INDEX.md) | **Master docs index (full Polis library)** |

<p align="center">🜏</p>

## Quick Links

[CI](.github/workflows/ci.yml) · [Releases](https://github.com/VaultSovereign/forge/releases) · [OpenAPI](docs/OPENAPI.md)

## 🜄 Quickstart

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

## ⚚ API

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


<p align="center">⚔️</p>

<p align="center"><sub>© VaultMesh • Earth’s Civilization Ledger </sub></p>
