# Changelog

<<<<<<< HEAD

=======

> > > > > > > origin/main
> > > > > > > All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

<<<<<<< HEAD

- (placeholder)

### Changed

- (placeholder)

### Security

- (placeholder)

## [1.1.0] - 2025-10-02

### Added

- Docs sitemap generator (`scripts/generate-docs-sitemap.mjs`) with hub/index buttons and auto-generated header.
- GitHub Pages workflow publishing `docs/` and generating `SITEMAP.md`.
- Docs landing (`docs/index.md`) + curated index buttons on `docs/INDEX.md`.
- GHCR image-publish workflow (multi-arch, latest/sha/semver tags, provenance) and `image:build`/`image:push` scripts.
- README Docker (GHCR) section, GHCR badge, Docs Index + Docs Sitemap badges, Table of Contents, Links section, “Back to top” link.
- Husky pre-commit guard blocking legacy `vaultmesh-ai` refs in staged `.md/.svg/.json/.sh/.yml/.yaml`.

### Changed

- CI: added GHCR login; container scan targets moved to `ghcr.io/vaultsovereign/forge`.
- Pages workflow switched to publish `docs/` (rendered Markdown) vs raw blobs.
- README: added “Docs Links (internal vs external)” under Run Modes; updated Pages URLs to `/forge/`; reordered badges; added tagline + Quickstart pointer; curated docs navigation.
- Repo metadata updated to `VaultSovereign/vm-forge` (homepage/repository/bugs).

### Security

- CI deny-list step fails PRs that reintroduce legacy `VaultSovereign/vaultmesh-ai` refs (broadened to .md/.svg/.json/.sh/.yml/.yaml) with local sweep hint.
- Recommendation: mark `docs-link-check`, `workbench-smoke`, and `ci` as required checks in branch protection.

## [1.0.1] - 2025-09-29

### Added

- **CI badge** in README for `ci.yml` (forge-prepush gates).
- **Pre-push PR template** with mandatory gate checklist.
- **Pre-push script** summary line (`[forge:summary] secrets.critical=..., review.high=...`).

### Changed

- Repository slug renamed to **`forge`** (core brand stays **VaultMesh.org**).
- CI workflow now includes **forge-prepush** job after build.

### Notes

- To enable remote scanners in CI, set one of: `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, or `OLLAMA_HOST`.
- Optional ledger signing: set `VAULTMESH_SIGNING_KEY`/`VAULTMESH_VERIFY_KEY`.

# [1.0.1]: https://github.com/VaultSovereign/vm-forge/releases/tag/v1.0.1

- (placeholder)

### Changed

- (placeholder)

### Fixed

- (placeholder)

### Security

- (placeholder)

### Docs

- Document GHCR image workflow and auto release-notes in README, CONTRIBUTING, and PROD_CHECKLIST.

<!--
Cut a new section on release, e.g.:

## [1.1.0] - 2025-10-02
### Added
- …

### Changed
- …

### Security
- …
-->

> > > > > > > origin/main
