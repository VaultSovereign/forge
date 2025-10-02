# Quickstart

## Prerequisites
- Docker 20.10+
- (Optional) GitHub PAT for GHCR auth

## Pull from GHCR
```bash
docker pull ghcr.io/vaultsovereign/forge:latest
```

## Run locally
```bash
docker run --rm ghcr.io/vaultsovereign/forge:latest
```

> Adjust ports/volumes/env as needed for your deployment.

## Build from source
```bash
docker build -t ghcr.io/vaultsovereign/forge:dev .
```

## Authenticate to GHCR
```bash
# GHCR requires a PAT with read:packages for pull, write:packages for push
echo "$CR_PAT" | docker login ghcr.io -u <github-username> --password-stdin
```

## Tag and push (maintainers)
```bash
# Example semantic version tag
docker tag ghcr.io/vaultsovereign/forge:dev ghcr.io/vaultsovereign/forge:v0.1.0

docker push ghcr.io/vaultsovereign/forge:v0.1.0
# Optionally also push latest
docker tag ghcr.io/vaultsovereign/forge:dev ghcr.io/vaultsovereign/forge:latest

docker push ghcr.io/vaultsovereign/forge:latest
```

