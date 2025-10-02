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
- [ ] Updated docs if behavior / flags changed (README + docs/**)
- [ ] If adding docs: ran `make docs:sitemap` locally or confirmed Pages workflow will regenerate
- [ ] CHANGELOG updated under **[Unreleased]** or a new section
- [ ] If publishing images: tags/versions noted in README (GHCR)
- [ ] If Dockerfile/image changed: verified tags visible on GHCR package page (Versions)
- [ ] If security/auth touched: updated `docs/SECURITY.md` and tested 401/403 paths

## Pages (docs)
- [ ] (If new/changed docs) **Pages enabled**: Settings → Pages → Source: *Deploy from a branch*, Branch: *main*, Folder: */docs*
- [ ] Confirmed `docs/index.md` renders and links to **Curated Index** and **Sitemap**

## Release notes (if user-visible)
- [ ] CHANGELOG updated under **[Unreleased]** (or the tagged section)
- [ ] Short release note prepared (1–2 lines, non-technical)
