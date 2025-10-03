# AI Companion Proxy — Final Operator Card

⚔️ **Status:** RUBEDO (Completion Phase)  
**Service:** `ai-companion-proxy` | **Region:** `europe-west3` | **Project:** `vaultmesh-473618`

---

## 🎯 Quick Command Reference

### Health & Access
```bash
make proxy-health        # Authenticated health check
make proxy-who           # Show IAM policy
```

### Guardian Drill
```bash
make proxy-drill         # Full drill → emits receipt
```

### Receipt Management
```bash
make proxy-receipts-latest    # View latest receipt (full details)
make proxy-receipts-validate  # Schema validation (latest 10)
make proxy-receipts-verify    # Hash verification (latest 10)
make proxy-receipts-root      # Compute daily Merkle root
```

---

## ✅ Current State

### Deployment Pipeline
- [x] Build → Artifact Registry → Cloud Run: **GREEN**
- [x] Org policy enforcement: **403 on unauth requests**
- [x] Authenticated access: **200 with ID token**
- [x] Service URL: Dynamic via `make proxy-url`

### Receipt System
- [x] Schema-valid JSON receipts
- [x] BLAKE3/SHA256 hashing
- [x] Provenance sidecars (`.prov`)
- [x] Daily Merkle root rollup
- [x] 30-day artifact retention (GitHub Actions)

### Alerting
- [x] Slack Block Kit format (rich formatting)
- [x] GitHub Actions `::error` annotations
- [x] **Rate limiting:** 5-minute cooldown (prevents alert storms)
- [x] Fail-fast on `DEGRADED` status

### CI/CD
- [x] Nightly smoke test workflow (02:00 UTC)
- [x] Workload Identity Federation wired
- [x] Automatic receipt validation + Merkle rollup
- [x] Artifact upload (receipts + roots)

---

## 🔒 Security Checklist

### Completed
- [x] Authenticated-only access (org policy enforced)
- [x] IAM audit capability (`make proxy-who`)
- [x] Webhook rotation procedure documented
- [x] Secret management via GitHub Actions secrets
- [x] Incident response template (`INCIDENT_2025-10-03_SLACK_WEBHOOK.md`)

### Final Steps (Optional Hardening)

1. **Rotate Slack webhook** (after initial exposure):
   ```bash
   # In Slack: Manage Apps → Incoming Webhooks → Add New → Copy URL
   # Then: GitHub Settings → Secrets → Update VM_SLACK_WEBHOOK_URL
   ```

2. **Enable GitHub secret scanning**:
   - Repository Settings → Security → Enable "Secret scanning"

3. **Dedicated runtime SA** (minimal permissions):
   ```bash
   gcloud iam service-accounts create proxy-runtime \
     --display-name="AI Companion Proxy Runtime"
   
   gcloud run services update ai-companion-proxy \
     --region=europe-west3 \
     --service-account="proxy-runtime@vaultmesh-473618.iam.gserviceaccount.com"
   ```

4. **Clean CI logs** (already set):
   ```makefile
   MAKEFLAGS += --no-print-directory
   ```

---

## 🧪 Verification Commands

### Smoke Test (Local)
```bash
# 1. Health check
make proxy-health

# 2. Full drill
make proxy-drill

# 3. Validate receipts
make proxy-receipts-validate

# 4. Compute Merkle root
make proxy-receipts-root

# 5. View latest receipt
make proxy-receipts-latest
```

### Slack Alerting Test
```bash
# After rotating webhook, test DEGRADED path
export VM_SLACK_WEBHOOK_URL='https://hooks.slack.com/services/NEW/WEBHOOK/URL'
bash ai-companion-proxy-starter/scripts/test-guardian-alert.sh

# Expected: Block Kit message in Slack channel
```

### CI Workflow Test
```bash
# Trigger nightly workflow manually
gh workflow run proxy-smoke-test.yml

# Monitor run
gh run list --workflow=proxy-smoke-test.yml --limit 1
```

---

## 📋 Documentation Index

| Doc | Purpose |
|-----|---------|
| [OPERATIONS.md](ai-companion-proxy-starter/OPERATIONS.md) | Operator quick reference (this document) |
| [RECEIPTS.md](docs/RECEIPTS.md) | Receipt schema, verification, Merkle rollup |
| [GUARDIAN_ALERTING.md](docs/GUARDIAN_ALERTING.md) | Slack Block Kit, rate limiting, GH Actions |
| [SECURITY_CHECKLIST_SLACK_WEBHOOK.md](docs/SECURITY_CHECKLIST_SLACK_WEBHOOK.md) | Webhook rotation, best practices |
| [INCIDENT_2025-10-03_SLACK_WEBHOOK.md](docs/INCIDENT_2025-10-03_SLACK_WEBHOOK.md) | Example incident response |

---

## 🎭 Alchemical Phase Status

| Phase | Status | Evidence |
|-------|--------|----------|
| **Nigredo** (Dissolution) | ✅ Complete | Service deployed, auth enforced |
| **Albedo** (Purification) | ✅ Complete | IAM audited, receipts validated |
| **Citrinitas** (Illumination) | ✅ Complete | Alerts ring, guardian sings |
| **Rubedo** (Completion) | ✅ **CURRENT** | Ledger remembers, steel sealed |

---

## ⚔️ Next Steps (On Demand)

### One-Tap Workflow Dispatch
```yaml
# Add workflow_dispatch inputs to proxy-smoke-test.yml
on:
  workflow_dispatch:
    inputs:
      skip_merkle:
        description: 'Skip Merkle rollup'
        type: boolean
        default: false
```

### PagerDuty Escalation
```bash
# Add to guardian-drill.sh (similar to Slack webhook)
if [ -n "${VM_PAGERDUTY_API_KEY:-}" ]; then
  curl -s -X POST "https://api.pagerduty.com/incidents" \
    -H "Authorization: Token token=${VM_PAGERDUTY_API_KEY}" \
    -H "Content-Type: application/json" \
    --data '{"incident": {"type": "incident", ...}}'
fi
```

### Advanced Observability
- **Prometheus metrics:** Export guardian drill results
- **Grafana dashboard:** Visualize OPERATIONAL vs DEGRADED over time
- **BigQuery archival:** Long-term receipt retention beyond 30 days

---

**Sealed by:** Vault Sovereign  
**Date:** 2025-10-03  
**Status:** ⚔️ **STEEL SUNG, GUARDIAN RINGS, LEDGER SEALED**
