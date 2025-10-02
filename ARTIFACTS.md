# CI Artifacts Guide

This repository generates security and quality artifacts on every CI run. These JSON files are uploaded as GitHub Actions artifacts and can be downloaded by reviewers to audit the codebase.

## Artifact Overview

| Artifact                    | Purpose                                                    | Critical Thresholds    | Location             |
| --------------------------- | ---------------------------------------------------------- | ---------------------- | -------------------- |
| **secrets_audit.json**      | Scans for exposed secrets, API keys, tokens                | `critical: 0`          | `artifacts/prepush/` |
| **code_review.json**        | Static analysis for security vulnerabilities, code quality | `high: 0`              | `artifacts/prepush/` |
| **container_security.json** | Docker image vulnerability scan                            | `critical: 0, high: 0` | `artifacts/prepush/` |
| **compliance_gaps.json**    | ISO 27001 compliance gap analysis                          | `high: 0`              | `artifacts/prepush/` |
| **sbom.json**               | Software Bill of Materials (dependencies)                  | Informational          | `artifacts/prepush/` |

## Gate Behavior

The CI pipeline enforces strict security gates:

- 🔴 **Build fails** if any artifact shows `critical` findings
- 🟡 **Build warns** on `high` severity findings (configurable via `FORGE_MAX_HIGH`)
- 🟢 **Build passes** with `medium` and below

## Downloading Artifacts

1. Go to **Actions** tab in GitHub
2. Click on the latest workflow run
3. Scroll to **Artifacts** section
4. Download `forge-prepush-artifacts.zip`
5. Extract and review JSON files

## Artifact Structure

Each artifact follows a consistent schema:

```json
{
  "timestamp": "2025-09-29T10:30:45Z",
  "scan_type": "secrets_audit",
  "summary": {
    "total_findings": 0,
    "critical": 0,
    "high": 0,
    "medium": 1,
    "low": 2
  },
  "findings": [
    {
      "severity": "medium",
      "file": "path/to/file",
      "line": 42,
      "description": "Finding details",
      "recommendation": "How to fix"
    }
  ],
  "signature": "-----BEGIN PGP SIGNATURE-----..." // If signing enabled
}
```

## Security Metrics Dashboard

For ongoing security posture monitoring, check the **Security Metrics Dashboard** template in `catalog/cyber/security-metrics-dashboard.yaml`. This can be deployed as a nightly job to track trends over time.

## Configuration

Customize thresholds via environment variables in CI:

```yaml
env:
  FORGE_MAX_CRITICAL: 0 # Never allow critical findings
  FORGE_MAX_HIGH: 0 # Default: fail on high severity
  FORGE_MAX_MEDIUM: 10 # Optional: limit medium findings
```

## Signed Receipts

When `VAULTMESH_SIGNING_KEY` is configured, artifacts include cryptographic signatures for tamper-proof audit trails. Use `VAULTMESH_VERIFY_KEY` to validate signatures.

---

💡 **Pro tip**: Set up branch protection rules to require artifact review before merge. The JSON files make security review fast and objective.
