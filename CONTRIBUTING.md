# Contributing

Thanks for your interest in improving Forge!

## Getting Started
- Fork the repo and create a feature branch from `main`.
- Keep changes focused and small; prefer multiple PRs over one large one.

## Commit Style
- Use Conventional Commits (e.g., `feat:`, `fix:`, `docs:`, `chore:`).

## Pull Requests
- Include a brief summary and context.
- Reference related issues if applicable.
- Ensure CI and link checks are green.

## Release process
- Update `CHANGELOG.md`: move items from [Unreleased] to a new section with version + date.
- Commit and push the changelog update.
- Tag the release (`git tag -a vX.Y.Z -m "vX.Y.Z — summary"`; `git push origin vX.Y.Z`).
- CI tag-guard will fail if [Unreleased] is still the top section.
- Release notes are generated automatically by the release-notes workflow.

## CI / CD Workflows

The repo includes several GitHub Actions workflows:

- **ci.yml** — base build + tests  
- **workbench-smoke.yml** — smoke checks  
- **docs-link-check.yml** — link validation  
- **image-publish.yml** — builds/pushes Docker images to GHCR (`ghcr.io/vaultsovereign/forge`)  
- **release-notes.yml** — auto-generates GitHub Releases from `CHANGELOG.md` on tag  

Images are built from the `Dockerfile` at the repo root. If you change it, the next push  
to `main` will automatically update the `:latest` image.
