## PR Overview

Explain what this change does and why.

### Checklist - Forge Gates

- [ ] Ran **local gate**: `make forge-prepush` (or `FORGE_FAST=1 make forge-prepush`)
- [ ] **No secrets** in diffs (critical = 0)
- [ ] **Code review** high severity = 0
- [ ] CI **forge-prepush** job is green

### Notes

- Skip flags (local only):
  - `FORGE_SKIP_DOCTOR=1` to skip doctor when providers aren't configured
  - `FORGE_SKIP_REMOTE_SCANS=1` to skip remote scanners
  - `FORGE_FAST=1` to skip SBOM/container/compliance advisories

### Security Artifacts

📋 **For reviewers**: See [ARTIFACTS.md](../ARTIFACTS.md) for interpreting CI artifact downloads

- Download `forge-prepush-artifacts.zip` from the [Actions tab](../../actions) (latest run)
- Each JSON file has clear severity thresholds and finding details
- Signed receipts available when configured
- 🤖 Bot comments below show live gate status

### Screenshots / Additional Context (optional)

- Attach screenshots or paste relevant output snippets if helpful
