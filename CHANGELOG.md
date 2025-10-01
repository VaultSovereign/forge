# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-09-29
### Added
- **CI badge** in README for `ci.yml` (forge-prepush gates).
- **Pre-push PR template** with mandatory gate checklist.
- **Pre-push script** summary line (`[forge:summary] secrets.critical=..., review.high=...`).

### Changed
- Repository slug renamed to **`vaultmesh-ai`** (core brand stays **VaultMesh.org**).
- CI workflow now includes **forge-prepush** job after build.

### Notes
- To enable remote scanners in CI, set one of: `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, or `OLLAMA_HOST`.
- Optional ledger signing: set `VAULTMESH_SIGNING_KEY`/`VAULTMESH_VERIFY_KEY`.

[1.0.1]: https://github.com/VaultSovereign/vaultmesh-ai/releases/tag/v1.0.1
