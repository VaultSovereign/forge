# VaultMesh AI - Copilot Instructions

This document provides essential context for contributing to the VaultMesh AI codebase.

## 1. Guiding Philosophy

- **Sovereign & Verifiable:** The system is a "Civilization Ledger." Every action must be an immutable, verifiable event recorded in the Reality Ledger. All components should be self-hostable.
- **Security as Code:** Security is not an afterthought. It is enforced through automated, auditable gates in the CI/CD pipeline (`forge-prepush`).
- **Extensible "Prompt OS":** The core is a framework for running structured prompts (templates). Contributions should favor creating new templates over modifying core logic.

## 2. Core Architecture

The system is architected as a "Prompt Operating System."

- **Dispatcher (`/dispatcher`):** The brain. It orchestrates template execution.
  - `router.ts`: Resolves and runs templates.
  - `safety.ts`: Enforces security guardrails _before_ an LLM call.
  - `ensureConforms.ts`: Validates LLM output against a JSON schema and performs a single auto-repair pass if needed.
- **Reality Ledger (`/reality_ledger`):** The heart. An immutable, append-only audit trail.
  - Every action is recorded as a content-addressed (hashed) event in a `.jsonl` file.
  - It has a Python core (`reality_ledger.py`) with a TypeScript adapter (`realityLedger.ts`).
- **Template Catalog (`/catalog`):** The library of capabilities.
  - Prompts are defined in YAML files with strict schemas (`id`, `keyword`, `inputs`, `prompt`, `outputs`).
  - Profiles (`/profiles`) like `@vault` or `@blue` inject voice and defaults into prompts.
- **CLI (`/cli`):** The primary user interface.
  - The modern CLI is `cli/index.ts` (`vm` command), built with `yargs`.
  - It uses dynamic `import()` for the `run` command to avoid initializing LLM providers unnecessarily.

## 3. Critical Workflow: The `forge-prepush` Gate

**This is the most important convention.** All contributions _must_ pass the local security and quality gate before pushing.

```bash
# Run the full gate before creating a pull request
make forge-prepush

# Or run a faster version for quick checks
FORGE_FAST=1 make forge-prepush
```

- This script is defined in `scripts/forge-prepush.sh`.
- It runs linting, tests, build, and then uses VaultMesh's own templates (`cyber-secrets-audit`, `cyber-code-security-reviewer`) to perform AI-driven security scans.
- The build will **fail** if critical secrets or high-severity code issues are found.
- **Pattern:** The script uses `jq` to dynamically construct JSON arguments from prescan artifacts and pipes them to `vm run`. This is a key integration pattern.
- It generates security reports in `artifacts/prepush/` as described in `ARTIFACTS.md`.

## 4. Key Patterns & Future Architecture

- **Template Scaffolding:** To create a new template, use the CLI's built-in scaffolder. This ensures the correct structure and file placement.
  ```bash
  vm scaffold template <family>.<name>
  ```
- **Argument Parsing:** The `vm run` command can take arguments as a JSON string or from a file reference (`-a @path/to/args.json`). This logic is in `cli/index.ts` in the `loadArgs` function.
- **MCP Integration:** The system can be controlled via natural language from Claude Code using the Model Context Protocol. The server is in `mcp/vaultmesh-mcp-server.ts`, and setup is documented in `docs/MCP_WIRING.md`.
- **Health Checks:** The `vm doctor` command provides environment diagnostics. The `Dockerfile` uses this for its `HEALTHCHECK` instruction.
