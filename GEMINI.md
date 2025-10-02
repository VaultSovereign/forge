# GEMINI Project Context

This document provides context for the VaultMesh Forge project, an AI-powered command-line interface for automating tasks in financial services, compliance, and cybersecurity.

## Project Overview

VaultMesh Forge is a "Prompt OS" that turns small commands into complex, structured outputs. It uses a template-driven architecture where YAML files define the prompts, inputs, and output schemas for the AI model. The platform is built with TypeScript and runs on Node.js. It uses `pnpm` for package management.

The core of the application is the `forge` CLI, which has the following key features:

- **Template Execution:** The `run` command executes a template from the `catalog` directory, sending a dynamically generated prompt to an AI model and validating the output against a JSON schema.
- **Reality Ledger:** All events are recorded in a "Reality Ledger," which provides an immutable audit trail. The CLI includes commands for verifying, querying, and viewing stats for the ledger.
- **Profiles:** The CLI uses profiles (e.g., `@vault`, `@blue`, `@exec`) to inject different "voices" and default settings into the prompts.
- **Safety:** The platform has built-in safety guardrails to prevent destructive actions and ensure that the AI operates within a predefined scope.

## Building and Running

### Prerequisites

- Node.js
- `pnpm` package manager (`npm install -g pnpm`)

### Installation

```bash
pnpm install
```

### Running the CLI

The main entry point for the application is the `vm` command. You can run it directly using `ts-node` for development or after building the project.

**Development:**

```bash
# Run a template
pnpm vm run tem-recon --profile blue --args '{"target":"example.com"}'

# View ledger stats
pnpm vm ledger stats
```

**Production:**

First, build the project:

```bash
pnpm build
```

Then, run the compiled CLI:

```bash
# Run a template
pnpm start run tem-recon --profile blue --args '{"target":"example.com"}'

# View ledger stats
pnpm start ledger stats
```

### Running Servers

The project also includes a "Model Context Protocol" (MCP) server and a "Workbench" server.

**MCP Server:**

```bash
# Development
pnpm mcp:dev
```

**Workbench Server:**

```bash
# Development (BFF)
pnpm workbench:dev:bff

# Development (Frontend)
pnpm workbench:dev:fe

# Production
pnpm workbench:start
```

### Testing

The project uses `vitest` for unit tests and `pytest` for the Reality Ledger tests.

```bash
# Run all tests
pnpm test

# Run Reality Ledger tests
pnpm test:ledger
```

## Development Conventions

- **TypeScript:** The project is written in TypeScript. Follow existing coding styles and conventions.
- **Templates:** New functionality is added by creating new YAML templates in the `catalog` directory. Use the `pnpm vm scaffold template <family>.<name>` command to generate a new template.
- **Schemas:** The output of each template is validated against a JSON schema defined in the `schemas` directory.
- **Reality Ledger:** All template executions are recorded in the Reality Ledger. This is a core feature of the platform and should be treated with care.
- **Linting and Formatting:** The project has placeholders for ESLint and Prettier, but they are not yet configured. (TODO)
