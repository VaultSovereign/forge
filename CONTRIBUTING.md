# Contributing

Thanks for contributing to Forge! This one‑pager covers setup, common commands, and how to resync after a history rewrite.

> Development note: local dev (`pnpm dev`) or containerized workflows only. Cloud IDE integration is not supported.

## First‑Time Setup

- Node.js 22 and pnpm (Corepack recommended: `corepack enable && corepack prepare pnpm@10.17.0 --activate`).
- Install deps exactly as locked: `pnpm install --frozen-lockfile`.
- Install Git hooks: `make hooks`.

## Local Development

- Dev workbench (two processes): `pnpm dev`.
- Single‑port preview: `make preview`.
- Smoke tests: `make smoke` (dev bypass) or `make tokened-smoke` (dev signer + JWKS).

## Docs Links (Header)

- Internal (/docs/* via BFF): `make docs:internal-preview`, `make docs:internal-dev`.
- External URL: `make docs:external DOCS_URL=...`, `make docs:external-dev DOCS_URL=...`.
- Flags: `VITE_EXPOSE_DOCS`, `EXPOSE_DOCS`, `VITE_DOCS_URL`, `VITE_EXPOSE_OPENAPI`, `EXPOSE_OPENAPI`.

## Tests & Gates

- Unit tests: `pnpm test`
- Deterministic ledger checks: `pnpm run test:forge`
- CI gate (local mirror): `make forge-prepush` (use `FORGE_SKIP_REMOTE_SCANS=1` when no provider keys).

## Commit Style

- Use Conventional Commits, e.g. `feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`.

## Pre‑Commit Guard (Local)

- Run `make hooks` to install Husky hooks.
- Manual sweep (optional): `rg -n -S '<term>' .`

## Helpful Docs

- Run Modes: `docs/README_RUN_MODES.md`
- Docs shortcuts: `docs/INDEX.md#run-modes-shortcuts-makefile`
- Security: `docs/SECURITY.md`
- Production Checklist: `docs/PROD_CHECKLIST.md`
- OpenAPI (Markdown): `docs/OPENAPI.md`

## Pull Requests

- Keep changes focused. Include summary, linked issues, and validation notes.
- Ensure CI is green. Use the PR template.

## Release process

- Update `CHANGELOG.md` from [Unreleased] to a new version + date.
- Tag and push: `git tag -a vX.Y.Z -m "vX.Y.Z" && git push origin vX.Y.Z`.
- Verify GHCR package shows the new tag.

## CI / CD Workflows

- `ci.yml` — build + tests
- `pages.yml` — publish docs to GitHub Pages
- `workbench-smoke.yml` — smoke checks
- `docs-link-check.yml` — link validation
- `release-notes.yml` — generate release notes from `CHANGELOG.md`

## Lint and Coverage Policy

- Lint: `pnpm lint` locally; `pnpm lint:ci` for strict CI.
- Coverage (Vitest): thresholds enforced on main (see `vitest.config.ts`). Use `COVERAGE_RELAX=1` only with lead approval.

### Test Modes

| Context       | What runs                              | Thresholds                   |
| ------------- | -------------------------------------- | ---------------------------- |
| `main` (push) | Full suite + coverage                  | Enforced (see config)        |
| Pull Requests | Changed-only (`pnpm run test:changed`) | Relaxed (`COVERAGE_RELAX=1`) |

Local commands:

```bash
COVERAGE_RELAX=0 pnpm test          # main-like
pnpm run test:changed               # PR-like, changed-only
```

## Resetting Local Clones After History Rewrite

We periodically purge large/ephemeral files from history. If you pulled before the rewrite, resync your clone:

```bash
# Save or stash local changes first
git fetch --all --prune
git checkout main
git reset --hard origin/main

# For feature branches rebased onto new main
git checkout your-branch
git rebase --rebase-merges --rebase-to origin/main your-branch
# If rebase is complex, create a fresh branch from main and cherry-pick needed commits.
```

Tips

- If you see "refusing to merge unrelated histories": run `git fetch --all --prune` then retry the reset.
- Recreate or update PRs if their base commits were rewritten.

