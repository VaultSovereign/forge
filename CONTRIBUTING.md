# Contributing

<<<<<<< HEAD
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
- # Optional: add docs-link-check as a required status check in branch protection to gate merges on green docs links.
  Thanks for your interest in improving Forge!

## Getting Started

- Fork the repo and create a feature branch from `main`.
- Keep changes focused and small; prefer multiple PRs over one large one.

## Commit Style

- Use Conventional Commits (e.g., `feat:`, `fix:`, `docs:`, `chore:`).

## Pull Requests

- Include a brief summary and context.
- Reference related issues if applicable.
- Ensure CI and link checks are green.

## Release process

- Update `CHANGELOG.md`: move items from [Unreleased] to a new section with version + date.
- Commit and push the changelog update.
- Tag the release (`git tag -a vX.Y.Z -m "vX.Y.Z — summary"`; `git push origin vX.Y.Z`).
- CI tag-guard will fail if [Unreleased] is still the top section.
- Release notes are generated automatically by the release-notes workflow.
- Confirm `ghcr.io/vaultsovereign/forge` shows the new tag under **Versions** (GHCR package page).

## CI / CD Workflows

The repo includes several GitHub Actions workflows:

- **ci.yml** — base build + tests
- **workbench-smoke.yml** — smoke checks
- **docs-link-check.yml** — link validation
- **image-publish.yml** — builds/pushes Docker images to GHCR (`ghcr.io/vaultsovereign/forge`)
- **release-notes.yml** — auto-generates GitHub Releases from `CHANGELOG.md` on tag

Images are built from the `Dockerfile` at the repo root. If you change it, the next push  
to `main` will automatically update the `:latest` image.

> > > > > > > origin/main

## Lint and Coverage Policy

- Lint
  - `pnpm lint` shows issues without failing CI (non-strict).
  - `pnpm lint:ci` is strict (`--max-warnings=0`) and fails on any warning. Switch CI to this when the warning backlog is reduced.
- Coverage (Vitest)
  - Minimal thresholds on main: lines ≥ 25%, statements ≥ 25%, functions ≥ 20%, branches ≥ 20% (see `vitest.config.ts`).
  - Escape hatch: set `COVERAGE_RELAX=1` (Team lead approval) to relax thresholds in emergencies.
  - PRs run changed-only tests to keep velocity high.

### Test Modes

| Context       | What runs                              | Thresholds                   | Toggle                         |
| ------------- | -------------------------------------- | ---------------------------- | ------------------------------ |
| `main` (push) | Full suite + coverage                  | Enforced (see above)         | `COVERAGE_RELAX=1` (lead-only) |
| Pull Requests | Changed-only (`pnpm run test:changed`) | Relaxed (`COVERAGE_RELAX=1`) | n/a                            |

Local commands:

```bash
# main-like
COVERAGE_RELAX=0 pnpm test

# PR-like, changed-only
pnpm run test:changed
```
