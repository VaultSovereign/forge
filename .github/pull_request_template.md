<<<<<<< HEAD

## PR Overview

Explain what this change does and why.

### Checklist - Forge Gates

- [ ] Ran **local gate**: `make forge-prepush` (or `FORGE_FAST=1 make forge-prepush`)
- [ ] **No secrets** in diffs (critical = 0)
- [ ] **Code review** high severity = 0
- [ ] CI **forge-prepush** job is green

### Notes

- Skip flags (local only):
  - `FORGE_SKIP_DOCTOR=1` to skip doctor when providers aren't configured
  - `FORGE_SKIP_REMOTE_SCANS=1` to skip remote scanners
  - `FORGE_FAST=1` to skip SBOM/container/compliance advisories

### Security Artifacts

📋 **For reviewers**: See [ARTIFACTS.md](../ARTIFACTS.md) for interpreting CI artifact downloads

- Download `forge-prepush-artifacts.zip` from the [Actions tab](../../actions) (latest run)
- Each JSON file has clear severity thresholds and finding details
- Signed receipts available when configured
- 🤖 Bot comments below show live gate status

### Screenshots / Additional Context (optional)

- # Attach screenshots or paste relevant output snippets if helpful

## Summary

<!-- What does this PR change and why? -->

## Proof / Verification

<!-- Attach screenshots, curl logs, or smoke run output here -->

## Checklist

- [ ] Conventional Commit in title (e.g., `feat:`, `fix:`, `docs:`, `chore:`)
- [ ] CI green (`ci`)
- [ ] Smoke green (`workbench-smoke`)
- [ ] Docs link check green (`docs-link-check`)
- [ ] README and docs/INDEX.md updated if flags/links changed
- [ ] Updated docs if behavior / flags changed (README + docs/\*\*)
- [ ] If adding docs: ran `make docs:sitemap` locally or confirmed Pages workflow will regenerate
- [ ] CHANGELOG updated under **[Unreleased]** or a new section
- [ ] If publishing images: tags/versions noted in README (GHCR)
- [ ] If Dockerfile/image changed: verified tags visible on GHCR package page (Versions)
- [ ] If security/auth touched: updated `docs/SECURITY.md` and tested 401/403 paths

## Pages (docs)

- [ ] (If new/changed docs) **Pages enabled**: Settings → Pages → Source: _Deploy from a branch_, Branch: _main_, Folder: _/docs_
- [ ] Confirmed `docs/index.md` renders and links to **Curated Index** and **Sitemap**

## Release notes (if user-visible)

- [ ] CHANGELOG updated under **[Unreleased]** (or the tagged section)
- [ ] Short release note prepared (1–2 lines, non-technical)
  > > > > > > > origin/main
