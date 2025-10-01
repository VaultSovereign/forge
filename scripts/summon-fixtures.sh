#!/usr/bin/env bash
set -euo pipefail

mkdir -p examples/inputs examples/prescan

# --- PRESCANS ---------------------------------------------------------------

# What changed (or full tree if not on PR)
cat > examples/prescan/pre_changed.json <<'JSON'
{
  "changed_only": false,
  "files": [
    "README.md",
    "mcp/vaultmesh-mcp-server.ts",
    "reality_ledger/node.ts",
    "Dockerfile",
    "schemas/output.schema.json"
  ]
}
JSON

# Secrets prescan (gitleaks-like normalized stub)
cat > examples/prescan/pre_secrets.json <<'JSON'
{
  "tool": "gitleaks",
  "findings": [
    {
      "file": "src/config.ts",
      "line": 14,
      "match": "OPENAI_API_KEY=sk-***redacted***",
      "rule": "generic-api-key"
    },
    {
      "file": ".env.example",
      "line": 1,
      "match": "DATABASE_URL=postgres://user:pass@host/db",
      "rule": "url-credentials"
    }
  ]
}
JSON

# Docker prescan (Trivy-like minimal + Dockerfile capture)
cat > examples/prescan/pre_docker.json <<'JSON'
{
  "dockerfile_path": "Dockerfile",
  "dockerfile_text": "FROM node:20-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\nFROM node:20-alpine\nWORKDIR /app\nCOPY --from=builder /app/dist ./dist\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCMD [\"node\",\"dist/cli/index.js\",\"doctor\"]\n",
  "trivy_report": {
    "Results": [
      {
        "Target": "node:20-alpine",
        "Vulnerabilities": [
          {
            "VulnerabilityID": "CVE-2024-0001",
            "PkgName": "musl",
            "InstalledVersion": "1.2.4",
            "Severity": "HIGH"
          }
        ]
      }
    ]
  }
}
JSON

# --- TEMPLATE INPUTS --------------------------------------------------------

# 0) Secrets Leak Audit
python3 - <<'PY'
import json
from pathlib import Path

payload = {
    "repo_context": "vaultmesh-forge v1.0.0 — demo",
    "files_index": "README.md\nsrc/config.ts\n.env.example\nmcp/vaultmesh-mcp-server.ts",
    "findings_raw": json.dumps(
        {
            "tool": "gitleaks",
            "findings": [
                {
                    "file": "src/config.ts",
                    "line": 14,
                    "match": "OPENAI_API_KEY=sk-***redacted***",
                    "rule": "generic-api-key"
                },
                {
                    "file": ".env.example",
                    "line": 1,
                    "match": "DATABASE_URL=postgres://user:pass@host/db",
                    "rule": "url-credentials"
                }
            ]
        },
        separators=(',', ':')
    ),
    "changed_only": False
}

Path("examples/inputs/secrets_audit.min.json").write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
PY

# 1) Code Security Reviewer
cat > examples/inputs/code_review.min.json <<'JSON'
{
  "repo_context": "vaultmesh-forge v1.0.0 — demo",
  "diffs_or_files": [
    "mcp/vaultmesh-mcp-server.ts",
    "reality_ledger/node.ts",
    "Dockerfile"
  ],
  "focus_areas": ["secrets", "injection", "crypto", "config"],
  "prescan": {
    "secrets": {
      "tool": "gitleaks",
      "findings": [
        { "file": "src/config.ts", "line": 14, "match": "OPENAI_API_KEY=sk-***redacted***", "rule": "generic-api-key" }
      ]
    },
    "static": { "eslint": { "errors": 0, "warnings": 3 } },
    "deps": { "lockfile": "pnpm-lock.yaml", "issues": [] }
  }
}
JSON

# 2) Compliance Gap Analyzer
cat > examples/inputs/compliance_gap.min.json <<'JSON'
{
  "current_controls": {
    "ci": { "tests": true, "coverage": 0.82, "secrets_gate": true, "container_scan": "trivy" },
    "ledger": { "hashing": "sha256", "signature": "ed25519?", "atomic_append": true, "canonical_json": true },
    "mcp": { "args_schema": "zod", "tools": ["list_templates","run_template","ledger_query","render_report","health"] },
    "security": { "env_policy": "no-secrets-in-repo", "sbom": "cyclonedx", "secrets_scan": "gitleaks|regex" },
    "docs": { "quickstart": true, "pilot_runbook": true }
  },
  "target_frameworks": ["NIST 800-53", "OWASP ASVS"]
}
JSON

# 3) Security Metrics Dashboard Generator
cat > examples/inputs/metrics.min.json <<'JSON'
{
  "audience": "security",
  "frameworks": ["NIST 800-53", "OWASP"],
  "data_sources": {
    "secrets": {
      "result": {
        "summary": { "critical": 0, "high": 1, "medium": 0, "low": 2, "info": 0 },
        "score": 88
      }
    },
    "review": {
      "result": {
        "summary": { "critical": 0, "high": 0, "medium": 1, "low": 2 },
        "score": 90
      }
    },
    "container": {
      "result": {
        "score": 85,
        "image_findings": [],
        "dockerfile_findings": []
      }
    }
  }
}
JSON

# 4) Container Security Scanner
cat > examples/inputs/container_scan.min.json <<'JSON'
{
  "dockerfile_path": "Dockerfile",
  "dockerfile_text": "FROM node:20-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\nFROM node:20-alpine\nWORKDIR /app\nCOPY --from=builder /app/dist ./dist\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCMD [\"node\",\"dist/cli/index.js\",\"doctor\"]\n",
  "trivy_report": {
    "Results": [
      {
        "Target": "node:20-alpine",
        "Vulnerabilities": [
          { "VulnerabilityID": "CVE-2024-0001", "PkgName": "musl", "InstalledVersion": "1.2.4", "Severity": "HIGH" }
        ]
      }
    ]
  }
}
JSON

# 5) AI Guardrail Checker
cat > examples/inputs/ai_guardrail.min.json <<'JSON'
{
  "agent_description": "VaultMesh Dispatcher orchestrates templates across providers and logs to Reality Ledger with schema enforcement and guardrails.",
  "permissions_matrix": {
    "run_template": { "scopes": ["catalog:*"], "approval": "none" },
    "ledger_query": { "scopes": ["ledger:read"], "approval": "none" },
    "fs_write": { "scopes": ["outputs/*", "reality_ledger/*"], "approval": "implicit-cli-only" },
    "network": { "scopes": [], "approval": "deny" }
  },
  "data_access": {
    "env": ["MODEL", "OPENROUTER_API_KEY"],
    "secrets": { "redaction": "enabled" },
    "outputs": "append-only"
  },
  "safety_policies": {
    "deny_by_default": true,
    "least_privilege": true,
    "run_as_readonly": true,
    "logging": { "inputs": true, "outputs": true, "hash": true, "sig_optional": true }
  },
  "ledger_expectations": { "must_log": ["inputs", "outputs", "hash", "sig?"] }
}
JSON

echo "✓ Fixtures created under examples/inputs and examples/prescan"
