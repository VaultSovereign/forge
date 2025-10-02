# Contributing

Thanks for contributing to Forge! This one‑pager covers local setup, hooks, and common commands.

> ⚠️ **Development Environment:** The Forge uses local development (`pnpm dev`) or containerized workflows only. Cloud IDE integration (Replit, etc.) is not supported.

## First‑Time Setup

- Install Node.js 20+ and pnpm (Corepack recommended: `corepack enable && corepack prepare pnpm@10.17.0 --activate`).
- Install dependencies exactly as locked: `pnpm install --frozen-lockfile`.
- Install Git hooks (local guard): `make hooks`.

## Local Development

- Single‑port preview: `make preview` (serves SPA + API on `PORT`, default 3000).
- Dev duo (HMR): `make dev2` (prints two‑shell commands for BFF and Vite).
- Dev workbench: `pnpm dev` (runs both BFF and frontend concurrently).
- Smoke tests:
  - Bypass auth: `make smoke`
  - Tokened (dev signer + JWKS): `make tokened-smoke`

## Docs Link Toggles (Header)

- Internal (BFF serves `/docs/*`):
  - `make docs:internal-preview`
  - `make docs:internal-dev`
- External URL (e.g., Pages/Confluence):
  - `make docs:external DOCS_URL=https://example/docs`
  - `make docs:external-dev DOCS_URL=https://example/docs`
- Flags: `VITE_EXPOSE_DOCS`, `EXPOSE_DOCS`, `VITE_DOCS_URL`
- API link flags: `VITE_EXPOSE_OPENAPI`, `EXPOSE_OPENAPI`

## Tests & Gates

- Unit tests: `pnpm test`
- Deterministic ledger checks: `pnpm run test:forge`
- CI gate (local mirror): `make forge-prepush`

## Commit Style

- Use Conventional Commits, e.g.:
  - `feat: add new template`
  - `chore(docs,ci): add Docs Links section and deny-list legacy links`

## Pre‑Commit Guard (Local)

- The repo includes a Husky pre‑commit hook that blocks commits if legacy repo references are detected in staged files.
- If hooks are missing, run: `make hooks`
- Manual sweep (optional): `rg -n -S '<legacy-term>' .`

## Helpful Docs

- Run Modes: `docs/README_RUN_MODES.md`
- Docs shortcuts: `docs/INDEX.md#run-modes-shortcuts-makefile`
- Security: `docs/SECURITY.md`
- Production Checklist: `docs/PROD_CHECKLIST.md`
- OpenAPI (Markdown): `docs/OPENAPI.md`

If anything is unclear, open an issue or a draft PR—happy to help.

## Maintainers

- Reviewers and code owners are defined in `CODEOWNERS`. For most areas, tag `@vaultsovereign` for review.
- Optional: add docs-link-check as a required status check in branch protection to gate merges on green docs links.
