# Forge

<!-- Badges -->
[![GHCR](https://img.shields.io/badge/ghcr-forge-6f42c1?logo=github&logoColor=white)](https://ghcr.io/vaultsovereign/forge)

Container image published via GitHub Container Registry (GHCR).

## Overview

This repository tracks the Forge container image and release artifacts for distribution via GHCR. It provides a minimal surface to pull, build, and publish the image in CI.

## Quickstart

- Pull latest image:
  - `docker pull ghcr.io/vaultsovereign/forge:latest`
- Run (adjust args/ports as your use case requires):
  - `docker run --rm ghcr.io/vaultsovereign/forge:latest`
- Build locally from Dockerfile in this repo:
  - `docker build -t ghcr.io/vaultsovereign/forge:dev .`
- Auth to GHCR (for private pulls/pushes):
  - `echo "$CR_PAT" | docker login ghcr.io -u <github-username> --password-stdin`

## Image Tags

- `latest` — most recent successful publish
- Semantic tags (e.g., `vX.Y.Z`) — when release tags are cut
- Commit tags (e.g., `sha-<shortsha>`) — optional for traceability

## Contributing

- Use Conventional Commits (e.g., `docs:`, `feat:`, `fix:`)
- Open a PR against `main` with a brief summary and context

## Docs

- See `docs/INDEX.md` for documentation hub and `docs/QUICKSTART.md` for detailed steps.

Note: GHCR does not expose pull counts publicly. A version/status badge is used instead of a pulls counter.
