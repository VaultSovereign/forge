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
