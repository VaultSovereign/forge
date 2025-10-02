# VaultMesh Forge - Replit Configuration

## Overview

VaultMesh Forge is a sovereign "Prompt OS" that transforms small commands into structured, auditable outputs for financial services compliance and cybersecurity operations. The platform is designed as "Earth's Civilization Ledger" - an immutable audit trail for all AI-assisted operations.

**Core Value Proposition**: Template-driven AI orchestration with built-in safety guardrails, schema validation, and cryptographic audit trails.

**Primary Use Cases**:
- DORA compliance automation (ICT Risk, TPRM, Incident Reporting)
- Cybersecurity audits and threat reconnaissance
- Financial services deck generation and proposals
- Operational resilience testing

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### 1. Template Execution Engine (Dispatcher)

**Location**: `/dispatcher/`

**Design Pattern**: Template-driven orchestration with multi-stage validation

**Core Components**:
- `router.ts` - Central execution router; resolves templates, manages LLM calls, validates outputs
- `safety.ts` - Pre-flight security checks; enforces read-only/advisory/lab-only boundaries
- `ensureConforms.ts` - JSON Schema validation with single auto-repair pass
- `expander.ts` - Mustache-like template variable expansion (supports `{{var}}` and `{{#each}}`)
- `modelProvider.ts` - Multi-provider LLM integration (OpenAI, OpenRouter, Ollama)

**Key Architectural Decisions**:
- **Deny-by-default safety**: All templates require explicit safety classification
- **Single repair pass**: LLM gets one chance to fix schema violations (prevents infinite loops)
- **Lazy provider initialization**: CLI uses dynamic imports to avoid initializing LLM providers unnecessarily
- **Sensitive data redaction**: Automatic redaction of keys/tokens/passwords in ledger events

### 2. Reality Ledger (Immutable Audit Trail)

**Location**: `/reality_ledger/`

**Design Pattern**: Content-addressed, append-only event log with optional cryptographic signatures

**Core Components**:
- `reality_ledger.py` - Python core for event storage and verification
- `node.ts` - TypeScript adapter for Node.js integration
- Daily sharded JSONL files (`events-YYYY-MM-DD.jsonl`)
- Deduplication indexes (`.idx` files) prevent duplicate event IDs

**Key Architectural Decisions**:
- **Dual-language implementation**: Python for core ledger operations, TypeScript wrapper for integration
- **Content-addressed storage**: SHA-256 hashes ensure tamper detection
- **Optional signatures**: Ed25519 signatures when `VAULTMESH_SIGNING_KEY` is configured
- **Day-based sharding**: Prevents file bloat, enables efficient time-range queries
- **Best-effort durability**: Ledger append failures don't block template execution

### 3. Template Catalog

**Location**: `/catalog/`

**Design Pattern**: YAML-based prompt definitions with strict JSON Schema validation

**Structure**:
```
catalog/
├── tem/          # TEM (remembrance) templates
├── dora/         # DORA compliance templates  
├── cyber/        # Cybersecurity templates
└── deck/         # Business presentation templates
```

**Schema Contract** (`/schemas/prompt.schema.json`):
- Required fields: `id`, `version`, `keyword`, `purpose`, `inputs`, `prompt`, `outputs`
- Inputs define parameters with types and validation rules
- Outputs reference JSON Schema definitions for strict validation
- Optional: `quality_checklist`, `safety_guardrails`

**Key Architectural Decisions**:
- **Schema-first design**: All templates validated against `prompt.schema.json` at build time
- **Profile injection**: Profiles (`@vault`, `@blue`, `@exec`) merge voice and defaults into prompts
- **Separation of concerns**: Template authors focus on prompts; schema enforcement is automated

### 4. CLI Interface

**Location**: `/cli/`

**Design Pattern**: Yargs-based command router with dynamic imports

**Primary Entry Points**:
- `index.ts` - Modern CLI (`vm` command) with subcommands: `run`, `ledger`, `doctor`, `scaffold`
- `forge.ts` - Legacy minimalist interface (minimal argument parsing)

**Key Commands**:
- `vm run <template>` - Execute a template with JSON arguments
- `vm ledger stats` - Query ledger statistics
- `vm ledger verify <id>` - Cryptographically verify a ledger event
- `vm doctor` - Health check for environment configuration

**Key Architectural Decisions**:
- **Dynamic imports for `run`**: Avoids initializing LLM providers when running `doctor` or `ledger` commands
- **Profile resolution**: Auto-detects `@profile` tokens in arguments
- **Flexible argument passing**: Supports `--args '{"key":"value"}'` or individual `--key value` flags

### 5. MCP Server Integration

**Location**: `/mcp/`

**Design Pattern**: JSON-RPC 2.0 server for Claude Code integration via Model Context Protocol

**Exposed Tools**:
- `list_templates` - Enumerate available templates with metadata
- `run_template` - Execute template with arguments
- `ledger_query` - Search ledger events by filters
- Agent tools: `codex.search`, `codex.get`, `forge.run`, `ledger.append`

**Key Architectural Decisions**:
- **Newline-delimited JSON-RPC**: Compatible with Claude Desktop's stdio transport
- **Tool-based architecture**: Each capability exposed as a discrete MCP tool
- **Environment variable forwarding**: MCP config passes `OPENROUTER_API_KEY`, `MODEL`, etc.

### 6. Security Pre-Push Gates

**Location**: `/scripts/forge-prepush.sh`

**Design Pattern**: Self-eating-dogfood security automation using VaultMesh's own templates

**Gate Sequence**:
1. TypeScript type checking
2. Vitest test suite with coverage enforcement
3. Build validation
4. `vm doctor` health check
5. AI-driven security scans:
   - `cyber-secrets-audit` - Detects exposed secrets
   - `cyber-code-security-reviewer` - Identifies vulnerabilities
   - Container image scanning (via Trivy)
   - Compliance gap analysis

**Output Artifacts** (`artifacts/prepush/`):
- `secrets_audit.json`, `code_review.json`, `container_security.json`, `compliance_gaps.json`, `sbom.json`

**Key Architectural Decisions**:
- **AI-powered gates**: Uses LLM templates to scan code (requires `OPENROUTER_API_KEY` or `OLLAMA_HOST`)
- **Strict thresholds**: Build fails if `critical > 0` or `high > 0` (configurable via `FORGE_MAX_HIGH`)
- **Prescan pattern**: Uses `jq` to construct JSON arguments from filesystem scans, pipes to `vm run`
- **Skip flags**: `FORGE_SKIP_REMOTE_SCANS=1` for environments without LLM access

### 7. Visual Workbench (Beta)

**Location**: `/workbench/`

**Design Pattern**: Backend-for-Frontend (BFF) architecture with React SPA

**Components**:
- `bff/` - Fastify backend (port 8787) with SSE streaming, auth middleware, core library integration
- `frontend/` - Vite + React + TypeScript SPA (port 5000)

**Replit Configuration**:
- Both services run automatically via `replit-run.sh`
- Frontend accessible on port 5000 (Replit webview)
- BFF accessible on port 8787 (proxied from frontend)
- Automatic fallback from pnpm to npm if needed

**API Surface**:
- `GET /v1/api/templates` - List templates
- `POST /v1/api/run/:id` - Execute template
- `GET /v1/api/execute/stream` - SSE stream for real-time logs
- `GET /v1/api/ledger` - Query ledger events
- `GET /v1/health` - Health check

**Key Architectural Decisions**:
- **SSE for streaming**: Server-Sent Events avoid WebSocket complexity; set `X-Accel-Buffering: no`
- **Auth bypass in dev**: `AUTH_DEV_BYPASS=1` skips OIDC checks locally
- **Static SPA serving**: BFF serves built React assets from `/public` in production
- **Future gRPC integration**: `CORE_GRPC_ADDR` environment variable reserved for microservice architecture

## External Dependencies

### Required Runtime Dependencies

**LLM Providers** (choose one):
- **OpenRouter** (recommended): Set `OPENROUTER_API_KEY` + `MODEL=meta-llama/llama-3.1-70b-instruct`
- **OpenAI**: Set `OPENAI_API_KEY` + `MODEL=gpt-4o-mini`
- **Ollama** (local): Set `OLLAMA_HOST=http://localhost:11434` + `MODEL=llama3.1:70b`

**Node.js Runtime**:
- Version: 18+ (requires native `fetch` API for Ollama provider)
- Package manager: `pnpm` (v10.17.0)
- Build target: ES2021 with ESM modules

**Python Runtime** (for Reality Ledger):
- Version: 3.8+
- Required for: `reality_ledger.py`, ledger verification, forge mint tests
- Dependencies: `pytest` (dev only)

### Optional Integrations

**Cryptographic Signing**:
- `VAULTMESH_SIGNING_KEY` - Ed25519 private key (hex) for event signatures
- `VAULTMESH_VERIFY_KEY` - Ed25519 public key (hex) for verification

**Security Scanning** (CI/pre-push):
- Trivy (container image scanning)
- Gitleaks (secret detection)
- CycloneDX (SBOM generation)

**Analytics** (opt-in):
- `ANALYTICS_OPTOUT=1` - Disable event emission
- Default: JSON logs to stdout (90-day retention pilot)

### External APIs/Services

**None required for core functionality**. All operations run locally or against configured LLM provider.

**Deployment Platforms** (optional):
- Google Cloud Run (see `/docs/DEPLOY_GCP.md`)
- Docker/Kubernetes (Helm chart planned)
- Replit (native support via `.replit` config)

### Database

**None**. The Reality Ledger uses filesystem-based JSONL storage:
- Events: `reality_ledger/events-YYYY-MM-DD.jsonl`
- Indexes: `reality_ledger/events-YYYY-MM-DD.idx`
- No external database required