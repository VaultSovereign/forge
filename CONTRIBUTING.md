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
