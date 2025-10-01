# VaultMesh — Workspace Layout (Option B)

This scaffolds a Cargo **workspace**:
- `vaultmesh/` — main binary/library (move your current `src/` here).
- `polis/controller/` — optional Axum microservice (stub here; wire up if used).

## Migrate existing code

```bash
# from repo root
mkdir -p vaultmesh/src
git mv src vaultmesh/ || mv src vaultmesh/
```

Then ensure the vaultmesh crate compiles:
```bash
cargo build -p vaultmesh
```

## Feature flags

- `http_portal` — enables the HTTP portal components (Axum/Tokio).
- `metrics` — enables Prometheus exporters and counters.
- `pq_signer` — gates post-quantum signer; OFF by default.

## CI

GitHub Actions workflow `.github/workflows/ci.yml` runs fmt, clippy, build, test on pushes/PRs.
