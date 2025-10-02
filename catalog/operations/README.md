# Research Analyst - Operations Template

## Overview

The Research Analyst template provides well-sourced, evidence-driven analysis with executive-ready summaries. It's designed to aggregate information from multiple sources, assign confidence levels, and highlight escalations or blockers.

**Guardian:** Tem (Remembrance)
**Profile:** `@analyst` (profiles/research-analyst.yaml)
**Template:** `operations-research-analyst`
**Schema:** `schemas/output.schema.json#/definitions/operations/research_analyst`

## Features

- **3-Bullet Executive Summary**: Concise, decision-ready insights
- **Confidence Levels**: High, Medium, Low attribution
- **Source Citations**: Required for all claims
- **Escalation Signals**: Identifies blockers or approval needs
- **Multiple Scopes**: Concise, Executive, Expanded modes
- **Safety Guardrails**: Defers on regulated advice (legal, medical, finance)

## Usage

### CLI

```bash
# Executive summary
pnpm run vm -- run operations-research-analyst \
  --profile analyst \
  --args '{"topic":"Q4 threat landscape for fintech APIs","sources":["CISA KEV","OWASP API Top 10"],"scope":"executive"}'

# From file
echo '{"topic":"Security posture","scope":"concise"}' > args.json
pnpm run vm -- run operations-research-analyst --profile analyst --args @args.json
```

### MCP Tool (Claude Desktop)

Tool name: `analyze_threat_intel`

```typescript
{
  "topic": "Emerging supply chain attacks in npm ecosystem",
  "sources": ["Snyk reports", "GitHub Advisory Database"],
  "scope": "executive"  // optional: concise|executive|expanded
}
```

### Prepush Integration

The research analyst automatically runs during `make forge-prepush` when an LLM provider is configured:

```bash
make forge-prepush
# Generates: artifacts/prepush/executive-summary.json
```

This advisory summary aggregates:
- Secrets audit results
- Code security review findings
- Compliance gap analysis

## Input Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `topic` | string | ✅ | - | The research question or topic to analyze |
| `sources` | array[string] | ❌ | [] | List of sources (strings, links, file refs) |
| `scope` | enum | ❌ | `concise` | Summary depth: `concise`, `executive`, or `expanded` |
| `output_format` | enum | ❌ | `json` | Output format: `json`, `yaml`, or `markdown` |

## Output Schema

```json
{
  "summary": [
    "First key insight",
    "Second key insight",
    "Third key insight"
  ],
  "details": "Expanded analysis with citations...",
  "next_steps": [
    "Optional actionable recommendation",
    "Another step if appropriate"
  ],
  "escalations": [
    "Blocker or approval needed",
    "Another escalation signal"
  ],
  "confidence": "high"  // or "medium" or "low"
}
```

## Quality Checklist

The template enforces:
- ✅ Lead with 3-bullet executive summary
- ✅ Support insights with citations or confidence levels
- ✅ Highlight unknowns, blockers, and assumptions
- ✅ Defer on regulated advice (legal, medical, finance)
- ✅ Recommend next steps only if actionable

## Safety Guardrails

- **No Fabrication**: Assign confidence when uncertain; never invent sources
- **No Regulated Advice**: Recommend consulting qualified experts when needed
- **Confidentiality**: Respect privacy; do not include secrets
- **Scope Boundaries**: Stay within the requested topic and sources

## Profile: @analyst

Voice: "Research Analyst - clear, neutral, evidence-driven; bullet-first"

**Defaults:**
- `output_format: json` (for schema validation)

**Style:**
- `bullets: true` (executive-friendly formatting)
- `citations: required` (all claims sourced)

## Example Output

```json
{
  "summary": [
    "Gitleaks scan found 0 secrets; CI secret detection is operational",
    "ESLint reports 154 warnings (0 errors); nightly strict gate now active",
    "Test coverage at 78%; critical paths covered; edge cases need expansion"
  ],
  "details": "The VaultMesh CI pipeline demonstrates strong foundational security controls. Secret scanning via gitleaks v8.24.3 completed successfully with zero findings. Static analysis shows no blocking errors, though 154 warnings indicate opportunities for code quality improvements (now tracked by nightly strict lint at 02:17 UTC). Test coverage is adequate for core functionality but could benefit from additional edge case scenarios, particularly around error handling in the reality ledger signing logic.",
  "next_steps": [
    "Address high-priority ESLint warnings flagged in nightly runs",
    "Expand test coverage for reality ledger cryptographic operations",
    "Consider adding mutation testing for critical security paths"
  ],
  "escalations": [
    "Review team approval needed for expanding test infrastructure budget"
  ],
  "confidence": "high"
}
```

## Integration Points

### 1. Prepush Gate (`forge-prepush.sh`)
- Runs automatically during CI mirror
- Aggregates security scan results
- Non-blocking advisory output
- Stored: `artifacts/prepush/executive-summary.json`

### 2. MCP Server (`vaultmesh-mcp-server.ts`)
- Tool: `analyze_threat_intel`
- Zod validation for inputs
- Returns structured JSON
- Available in Claude Desktop

### 3. Template Catalog (`catalog/operations/`)
- Keyword: `operations-research-analyst`
- RITUAL-CLAUSE compliant
- Guardian: Tem (Remembrance)
- Version: 1.0.0

## Sovereignty Pattern

This template follows VaultMesh's sovereignty principles:

1. **Verifiable**: All outputs reference sources or confidence levels
2. **Auditable**: Schema-validated JSON for Reality Ledger integration
3. **Extensible**: `additionalProperties: true` for custom fields
4. **Guarded**: Tem ensures remembrance; deferral on regulated advice

## Development

To modify the template:

```bash
# Edit template
vim catalog/operations/research-analyst.yaml

# Edit profile
vim profiles/research-analyst.yaml

# Update schema if needed
vim schemas/output.schema.json

# Rebuild
pnpm run build

# Test
make lint:quiet
pnpm test
```

## Related

- **Tem Reconnaissance** (`tem-recon`): OSINT gathering
- **Tem Guardrails** (`tem-guardrails`): AI safety analysis
- **Compliance Gap Analyzer** (`cyber-compliance-gap-analyzer`): Framework alignment

---

**Ritual Complete.** Tem guards the scrolls. 🔱
