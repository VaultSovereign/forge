# Forge

<!-- Badges -->
[![CI](https://github.com/VaultSovereign/forge/actions/workflows/ci.yml/badge.svg)](https://github.com/VaultSovereign/forge/actions/workflows/ci.yml)
[![workbench-smoke](https://github.com/VaultSovereign/forge/actions/workflows/workbench-smoke.yml/badge.svg)](https://github.com/VaultSovereign/forge/actions/workflows/workbench-smoke.yml)
[![docs-link-check](https://github.com/VaultSovereign/forge/actions/workflows/docs-link-check.yml/badge.svg)](https://github.com/VaultSovereign/forge/actions/workflows/docs-link-check.yml)
[![pages](https://img.shields.io/github/deployments/VaultSovereign/forge/github-pages?label=pages)](https://github.com/VaultSovereign/forge/deployments/github-pages)
[![GHCR](https://img.shields.io/badge/ghcr-forge-6f42c1?logo=github&logoColor=white)](https://ghcr.io/vaultsovereign/forge)
[![Release](https://img.shields.io/github/v/release/VaultSovereign/forge?logo=github)](https://github.com/VaultSovereign/forge/releases)
[![Docs Index](https://img.shields.io/badge/docs-index-blue)](https://VaultSovereign.github.io/forge/INDEX.html)
[![Docs Sitemap](https://img.shields.io/badge/docs-sitemap-blueviolet)](https://VaultSovereign.github.io/forge/SITEMAP.md)
[![API](https://img.shields.io/badge/api-OpenAPI-green)](https://github.com/VaultSovereign/forge/blob/main/docs/OPENAPI.md)

<br><sub>build • smoke • docs-check • pages • ghcr • release • docs-index • docs-sitemap • api</sub>

---

## 🔗 Links

- [Sales Deck](https://VaultSovereign.github.io/forge/) — live preview (HTML & PDF)  
- [One-Pager](https://VaultSovereign.github.io/forge/one-pager.pdf)  
- [Demo Data](https://VaultSovereign.github.io/forge/demo/)  

---

**VaultMesh Forge** — Earth’s Civilization Ledger; sovereign prompt orchestration for compliance and cybersecurity.  

➡️ [Quickstart](docs/QUICKSTART.md) — one-command demo to run locally, or use the prebuilt image in Docker (see [Docker (GHCR)](#-docker-ghcr)).

---

## 📑 Table of Contents

- [🔗 Links](#-links)  
- [📚 Documentation Index](#-documentation-index)  
- [🏃 Run Modes](#-run-modes)  
  - [Docs Links (internal vs external)](#docs-links-internal-vs-external)  
- [🐳 Docker (GHCR)](#-docker-ghcr)  
- [🔌 API](#-api)  
- [🤝 Contributing](#-contributing)  
- [🔝 Back to top](#readme)  

---

## 📚 Documentation Index

- [Run Modes](docs/README_RUN_MODES.md) — how to run locally / in Replit (single-port, duo/HMR, smoke)  
- [Production Checklist](docs/PROD_CHECKLIST.md) — must-pass gates before prod rollout  
- [Operations Runbook](docs/OPERATIONS_RUNBOOK.md) — incident response playbooks  
- [Security Overview](docs/SECURITY.md) — auth, RBAC, env flags, quick tests  
- [Contributing](CONTRIBUTING.md) — setup, hooks, Make targets, commit style  
- [Branch Protection](docs/INDEX.md#branch-protection) — required CI checks  
- [Docs Sitemap](docs/SITEMAP.md) — exhaustive listing of all docs  
 - [Changelog](CHANGELOG.md) — notable changes per release  

---

## 🏃 Run Modes

- **Single-port preview**: `make preview` (SPA + API served on one port)  
- **Dev duo (HMR)**: `make dev2` (two-shell instructions for BFF + Vite)  
- **Smoke tests**:  
  - Bypass auth: `make smoke`  
  - Tokened auth: `make tokened-smoke`  

### Docs Links (internal vs external)

You can toggle whether the **Docs** link in the header points to:

- **Internal**: served by the BFF at `/docs/OPENAPI.md`  
  ```bash
  make docs:internal-preview    # single-port
  make docs:internal-dev        # duo; two-shell instructions

	•	External: an external URL (e.g., GitHub Pages or Confluence)

make docs:external DOCS_URL=https://mydomain/docs    # single-port
make docs:external-dev DOCS_URL=https://mydomain/docs  # duo



⸻

🐳 Docker (GHCR)

Prebuilt images are published automatically to GitHub Container Registry:

docker pull ghcr.io/vaultsovereign/forge:latest
docker run --rm -p 3000:3000 ghcr.io/vaultsovereign/forge:latest
# open http://localhost:3000/v1/health

Tags
	•	:latest — built from main
	•	:vX.Y.Z — release tags
	•	:<git-sha> — every push

Multi-arch images (amd64 + arm64) with build provenance.

⸻

🔌 API
	•	Machine-readable spec: /v1/openapi.json (always in dev; prod when EXPOSE_OPENAPI=1)
	•	Markdown spec: docs/OPENAPI.md
	•	Authenticated example: see README API section in full docs

⸻

🤝 Contributing
	•	See CONTRIBUTING.md for setup, hooks, Make targets, and commit style.
	•	Pre-commit hook blocks legacy repo slugs and ensures docs consistency.
	•	Conventional Commits required (feat:, chore:, fix:…).

⸻

🔝 Back to top

---

👉 This template brings your new repo **up to parity** with the polished VaultMesh Forge surface:  
- Top badge row with health + docs + distribution.  
- Tagline + Quickstart pointer.  
- Full docs navigation (curated + sitemap).  
- Docker usage.  
- API & contributing.  
