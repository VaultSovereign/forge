---
name: Release checklist
about: Steps to cut a new release
labels: release
---

### Pre-release
- [ ] CHANGELOG updated and section cut (e.g., `[1.1.0] - YYYY-MM-DD`)
- [ ] CI green on `main`
- [ ] Pages renders (docs hub + sitemap)
- [ ] GHCR image exists for latest commit (or will on tag)

### Tag & publish
- [ ] `git tag -a vX.Y.Z -m "vX.Y.Z — summary"`; `git push origin vX.Y.Z`
- [ ] Release notes auto-generated (release-notes workflow) and look correct

### Post-release
- [ ] README badges/links still valid (CI/smoke/docs-check/pages/GHCR/release/docs-index/docs-sitemap/API)
- [ ] (Optional) announce or update external docs references

