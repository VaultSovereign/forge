<<<<<<< HEAD

# Curated Docs Index

<div style="margin:16px 0; display:flex; gap:12px; flex-wrap:wrap;">
  <a href="index.md" style="display:inline-block; padding:8px 12px; background:#0969da; color:#fff; border-radius:6px; text-decoration:none; font-weight:600;">🏠 Docs Hub</a>
  <a href="SITEMAP.md" style="display:inline-block; padding:8px 12px; background:#6f42c1; color:#fff; border-radius:6px; text-decoration:none; font-weight:600;">👉 Full Sitemap</a>
</div>

## 📑 Table of Contents

- [Run Modes Shortcuts (Makefile)](#run-modes-shortcuts-makefile)
- [Docs Sitemap](SITEMAP.md)

- Run Modes — how to run locally (single-port, duo/HMR, smoke)
  - docs/README_RUN_MODES.md
- Production Checklist — must-pass gates before production rollout
  - docs/PROD_CHECKLIST.md
- Operations Runbook — incident playbooks for common faults
  - docs/OPERATIONS_RUNBOOK.md
- Security Overview — auth, RBAC, env flags, quick tests
  - docs/SECURITY.md
- Branch Protection — required checks: docs-link-check, workbench-smoke, ci
  - CONTRIBUTING.md#maintainers
- [Run Modes Shortcuts (Makefile)](#run-modes-shortcuts-makefile) — quick commands for Docs links

- OpenAPI — API reference for the Workbench BFF
  - docs/OPENAPI.md
- Docs Sitemap — browse all docs
  - docs/SITEMAP.md

## Run Modes Shortcuts (Makefile)

Quick commands for internal/external Docs links in the Workbench header. See also: [docs/README_RUN_MODES.md](README_RUN_MODES.md).

**Internal (served by BFF at /docs)**

- Single‑port preview:
  ```bash
  make docs:internal-preview
  ```
- Dev duo (two‑shell instructions):
  ```bash
  make docs:internal-dev
  ```

**External (e.g., GitHub Pages / Confluence)**

- Single‑port preview:
  ```bash
  make docs:external DOCS_URL=https://mydomain/docs
  ```
- Dev duo (two‑shell instructions):
  ```bash
  make docs:external-dev DOCS_URL=https://mydomain/docs
  ```

Notes

- API link (/v1/openapi.json) appears when import.meta.env.DEV or VITE_EXPOSE_OPENAPI=1; server route gated by EXPOSE_OPENAPI=1 (or dev).
- Docs link appears when VITE_EXPOSE_DOCS=1. Defaults to /docs/OPENAPI.md; override with VITE_DOCS_URL.
- # For internal docs, set EXPOSE_DOCS=1 on the BFF to serve /docs/\*.

# Documentation Index

Welcome to the Forge documentation hub.

- Quickstart: see [QUICKSTART.md](QUICKSTART.md)
- Image tags and publishing: see Quickstart and CI notes
- Authentication to GHCR: requires a GitHub Personal Access Token (PAT) with `read:packages` (pull) and `write:packages` (push)
- [Changelog](../CHANGELOG.md) — notable changes per release

## GitHub Pages (optional)

If you want these docs served via GitHub Pages:

- Settings → Pages → Build and deployment → Source: `Deploy from a branch`
- Branch: `main` and folder: `/docs`

## Branch Protection

Recommended required status checks before merging to `main`:

- `CI` — basic repo sanity (placeholder)
- `workbench-smoke` — smoke pass on docs/README changes
- `docs-link-check` — offline link check for README + docs

## Deployment / Distribution

- GHCR package: https://github.com/orgs/VaultSovereign/packages/container/package/forge
- Docker instructions: see [README → Docker (GHCR)](../README.md#-docker-ghcr)
  > > > > > > > origin/main
