# Repository Guidelines

## Project Structure & Module Organization
VaultMesh Forge TypeScript entry points live in `agent/`, `dispatcher/`, `cli/`, `mcp/`, `tools/`, and `reality_ledger/`, and their outputs compile into `dist/`. Templates and prompt assets are versioned in `catalog/`, `profiles/`, and `schemas/`, while ledger fixtures and helper scripts reside in `tests/` and `scripts/`. Generated folders such as `dist/`, `logs/`, `coverage/`, and temporary SBOMs stay out of source control.

## Build, Test, and Development Commands
- `pnpm install --frozen-lockfile` ensures dependencies match `pnpm-lock.yaml`.
- `pnpm run build` typechecks and emits transpiled bundles plus copied catalogs.
- `pnpm test` runs the Vitest suite with coverage thresholds enforced.
- `pnpm run test:forge` (or `pytest -q -rA tests/test_unforged_forge.py`) validates deterministic ledger artifacts; use `pnpm run test:forge:deps` for a one-shot dependency install.
- `pnpm run vm -- --help` lists CLI entry points; run automation via `pnpm run vm -- run <keyword>`.
- `make forge-prepush` mirrors the CI gate (typecheck, lint placeholders, build, doctor, security scans).

## Coding Style & Naming Conventions
Code targets strict ESM on ES2021 with two-space indentation and single quotes by default. Use `camelCase` for variables and functions, `PascalCase` for classes, and kebab-case for template keywords (for example `catalog/forge-ledger.yaml`). Keep error messages specific and redact sensitive values with helpers such as `redactSensitiveArgs`.

## Testing Guidelines
Place new Vitest specs beside their sources with the `*.test.ts` suffix and stub external providers. Python checks belong in `tests/test_*.py` and must assert deterministic hashes for artifacts, receipts, checkpoints, and indexes. Maintain existing coverage; investigate any Vitest coverage regressions before merging.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `ci(docs):`, `enhance:`) and squash fixups prior to review. Pull requests need a concise scope summary, linked issues, CLI output or screenshots for behavior changes, and confirmation that `make forge-prepush` ran (or document `FORGE_SKIP_REMOTE_SCANS=1` usage). Tag owners from `CODEOWNERS` and highlight risk areas or schema updates.

## Security & Configuration Tips
Provide one of `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, or `OLLAMA_HOST` to enable remote security scans; otherwise declare `FORGE_SKIP_REMOTE_SCANS=1`. Store prompt assets only under `catalog/` and update `schemas/` plus validators whenever template contracts change, keeping dispatcher and doctor checks synchronized.
