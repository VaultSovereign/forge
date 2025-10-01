# Repository Guidelines

## Project Structure & Module Organization
- TypeScript entry points live in `agent/`, `dispatcher/`, `cli/`, `mcp/`, `tools/`, and `reality_ledger/`; bundles emit to `dist/`.
- Templates and prompt assets: `catalog/`, `profiles/`, `schemas/`.
- Tests and helper scripts: `tests/`, `scripts/`.
- Generated artifacts kept out of VCS: `dist/`, `logs/`, `coverage/`, temporary SBOMs.

## Build, Test, and Development Commands
- `pnpm install --frozen-lockfile` — install deps exactly as in `pnpm-lock.yaml`.
- `pnpm run build` — TypeScript typecheck, transpile to `dist/`, and copy catalogs.
- `pnpm test` — run Vitest with enforced coverage thresholds.
- `pnpm run test:forge` or `pytest -q -rA tests/test_unforged_forge.py` — validate deterministic ledger artifacts; use `pnpm run test:forge:deps` for one‑shot dependency setup.
- `pnpm run vm -- --help` — list CLI entry points; `pnpm run vm -- run <keyword>` to execute automation.
- `make forge-prepush` — mirrors CI gate (typecheck, lint placeholders, build, doctor, security scans).

## Coding Style & Naming Conventions
- Strict ESM targeting ES2021; two‑space indentation; single quotes by default.
- Naming: `camelCase` (vars/functions), `PascalCase` (classes), kebab‑case for template keywords (e.g., `catalog/forge-ledger.yaml`).
- Keep error messages specific; redact secrets using helpers like `redactSensitiveArgs`.

## Testing Guidelines
- Place Vitest specs beside sources with the `*.test.ts` suffix; stub external providers.
- Python validations in `tests/test_*.py` must assert deterministic hashes for artifacts, receipts, checkpoints, and indexes.
- Maintain existing coverage; investigate any Vitest coverage regressions before merging.

## Commit & Pull Request Guidelines
- Use Conventional Commits (e.g., `feat:`, `ci(docs):`, `enhance:`); squash fixups before review.
- PRs should include: concise scope summary, linked issues, CLI output or screenshots for behavior changes, and confirmation that `make forge-prepush` ran (or document `FORGE_SKIP_REMOTE_SCANS=1`). Tag owners in `CODEOWNERS` and call out risk areas/schema updates.

## Security & Configuration Tips
- Provide one of `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, or `OLLAMA_HOST` to enable remote security scans; otherwise set `FORGE_SKIP_REMOTE_SCANS=1`.
- Store prompt assets only under `catalog/`; update `schemas/` and validators when template contracts change, keeping dispatcher and doctor checks synchronized.

