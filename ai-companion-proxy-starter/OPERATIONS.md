# AI Companion Proxy — Operator Quick Reference

**Service:** `ai-companion-proxy` | **Region:** `europe-west3` | **Project:** `vaultmesh-473618`

---

## 🎯 Core Operations

### Health & Access Checks

```bash
# Authenticated health check (requires gcloud identity token)
make proxy-health

# Show IAM policy (who can invoke the service)
make proxy-who
```

### Guardian Drill

```bash
# Run full drill → emits receipt + provenance + hash
make proxy-drill
```

**Expected output:**
```
✅ Guardian Drill Complete
   - Auth enforcement: ✅ (403 without token)
   - Authenticated access: ✅ (200 with token)
   - Status: OPERATIONAL
🧾 Receipt: proxy-guardian-20251003T020612Z.json
🔏 Hash (SHA256): 898ac5ca4bdeca1dd67dde806ef4571369a11138094bbf1c1e82ce4fa94b5fa7
```

---

## 📜 Receipt Management

### View Latest Receipt

```bash
# Shows: receipt JSON, provenance, hashes, minisign verification, Merkle root
make proxy-receipts-latest
```

### Validate Schema Conformance

```bash
# Validates latest 10 receipts against JSON schema
make proxy-receipts-validate
```

### Verify Cryptographic Integrity

```bash
# Recomputes BLAKE3/SHA256 hashes for latest 10 receipts
make proxy-receipts-verify
```

### Compute Daily Merkle Root

```bash
# Rolls all receipts from today into a single cryptographic root
make proxy-receipts-root
```

**Example output:**
```
🌳 Merkle root for 2025-10-03: cb8abdca06a3274420d87a7eba32d278bacfd8ed4830a6aa1a4975a8dd754d65 (count=2)
   → ai-companion-proxy-starter/artifacts/roots/root-2025-10-03.json
```

---

## 🚨 Alerting & Monitoring

### Status Behavior

- **OPERATIONAL:** Drill passes, exit 0, no alerts
- **DEGRADED:** Drill fails, exit 1, triggers:
  - GitHub Actions `::error` annotation
  - Slack webhook POST (Block Kit format)

### Slack Configuration

**One-time setup:**

1. Create incoming webhook in Slack workspace
2. Store as GitHub Actions secret: `VM_SLACK_WEBHOOK_URL`
3. Workflow already wired (see `.github/workflows/proxy-smoke-test.yml`)

**Alert format (Block Kit):**
```
┌─────────────────────────────────────┐
│ ⚠️ Guardian Drill DEGRADED          │
├─────────────────────────────────────┤
│ Service:       ai-companion-proxy   │
│ Region:        europe-west3         │
│ Status:        DEGRADED             │
│ Receipt:       proxy-guardian-...   │
│ Auth OK:       false                │
│ Enforce OK:    true                 │
├─────────────────────────────────────┤
│ 🔗 Service URL (clickable)          │
└─────────────────────────────────────┘
```

**Documentation:** See [GUARDIAN_ALERTING.md](../docs/GUARDIAN_ALERTING.md)

### GitHub Actions Workflow

**File:** `.github/workflows/proxy-smoke-test.yml`

**Schedule:** Daily at 02:00 UTC (Nigredo hour)

**What it does:**
1. Runs guardian drill
2. Validates receipts (schema)
3. Computes Merkle root
4. Uploads artifacts
5. **Fails if DEGRADED** (rings bell in Slack + marks CI red)

**Manual trigger:**
```bash
gh workflow run proxy-smoke-test.yml
```

---

## 🔧 Deployment & Infrastructure

### Deploy to Cloud Run

```bash
# Build, push to Artifact Registry, deploy via Cloud Build
make -C ai-companion-proxy-starter deploy
```

### Grant Access to Service Accounts

```bash
PROJECT_ID=$(gcloud config get-value project)
CALLER_SA="your-service@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud run services add-iam-policy-binding ai-companion-proxy \
  --region=europe-west3 \
  --member="serviceAccount:${CALLER_SA}" \
  --role="roles/run.invoker"
```

## Nightly Smoke Tests

The repository includes a GitHub Actions workflow that runs the guardian drill nightly at 02:00 UTC and archives receipts.

**Setup (one-time):**

1. Configure Workload Identity Federation for GitHub Actions
2. Add secrets to repository:
   - `GCP_WORKLOAD_IDENTITY_PROVIDER`
   - `GCP_SERVICE_ACCOUNT`
   - `GCP_PROJECT_ID`

**Manual trigger:**

```bash
# Via GitHub CLI
gh workflow run proxy-smoke-test.yml

# Or via GitHub UI: Actions → AI Companion Proxy - Nightly Smoke Test → Run workflow
```

**Artifacts:**
- Guardian drill receipts saved to `artifacts/drills/proxy-guardian-*.json`
- Provenance files: `artifacts/drills/proxy-guardian-*.json.prov`
- Uploaded as GitHub Actions artifacts
- Retained for 30 days
- Hash-sealed with BLAKE3 or SHA256

**Receipt Integration:**
- Each nightly run emits a signed receipt
- Receipts are content-addressed (hashed)
- Provenance includes hash algorithm, hex digest, and emission timestamp
- Compatible with Reality Ledger archival

---

## 📊 Troubleshooting

### Drill Fails (DEGRADED Status)

**Symptoms:** Exit code 1, Slack alert, GitHub Actions job failed

**Investigation:**
```bash
# 1. View latest receipt
make proxy-receipts-latest

# 2. Check specific failure
jq '.checks' ai-companion-proxy-starter/artifacts/drills/proxy-guardian-<TIMESTAMP>.json

# 3. Manual health check
curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  "$(make -C ai-companion-proxy-starter url)/health" | jq .
```

**Common causes:**
- Service not deployed or unavailable
- IAM policy misconfigured
- Identity token expired/invalid
- Org policy blocking (check `make proxy-who`)

### Token Acquisition Fails

**Error:** `Invalid account type for --audiences`

**Fix:**
```bash
gcloud auth application-default login
make proxy-health
```

### Receipts Not Validating

**Symptoms:** `❌ <file>.json` from `make proxy-receipts-validate`

**Investigation:** See [RECEIPTS.md](../docs/RECEIPTS.md) for schema debugging

---

## 🛡️ Security Posture

### Authentication Model

- **Unauthenticated:** `403 Forbidden` (org policy enforced)
- **Authenticated:** Requires valid identity token from authorized principal

### IAM Bindings

```bash
# View current invokers
make proxy-who

# Grant access to a principal
gcloud run services add-iam-policy-binding ai-companion-proxy \
  --region=europe-west3 \
  --member="serviceAccount:caller@vaultmesh-473618.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

### Auth-only enforce (one-time cleanup)

If the service was ever deployed with public access, remove the public grant once:

```bash
gcloud run services remove-iam-policy-binding ai-companion-proxy   --region=europe-west3   --member=allUsers   --role=roles/run.invoker || true
```

Terraform now manages invokers authoritatively via a single binding; do not add `allUsers` in future deploys (Cloud Build omits `--allow-unauthenticated`).


### Audit Trail

- **Receipts:** Immutable, signed, timestamped proofs
- **Provenance:** Hash algorithm + emitted timestamp
- **Merkle roots:** Daily cryptographic rollup
- **Retention:** 30 days in GitHub Actions artifacts

---

## 📚 Related Documentation

- **[RECEIPTS.md](../docs/RECEIPTS.md)** — Schema, verification, cadence
- **[GUARDIAN_ALERTING.md](../docs/GUARDIAN_ALERTING.md)** — Slack Block Kit, GH Actions integration
- **[SECURITY_CHECKLIST_SLACK_WEBHOOK.md](../docs/SECURITY_CHECKLIST_SLACK_WEBHOOK.md)** — Webhook rotation
- **[INCIDENT_2025-10-03_SLACK_WEBHOOK.md](../docs/INCIDENT_2025-10-03_SLACK_WEBHOOK.md)** — Example incident response

---

**Last Updated:** 2025-10-03  
**Operator:** Vault Sovereign  
**Status:** ✅ OPERATIONAL (Rubedo phase complete)

**Receipt Commands:**

```bash
# View receipt JSON
jq . ai-companion-proxy-starter/artifacts/drills/proxy-guardian-<TIMESTAMP>.json

# View provenance (hash, algorithm, timestamp)
cat ai-companion-proxy-starter/artifacts/drills/proxy-guardian-<TIMESTAMP>.json.prov

# Verify hash
b3sum ai-companion-proxy-starter/artifacts/drills/proxy-guardian-<TIMESTAMP>.json
# or
shasum -a 256 ai-companion-proxy-starter/artifacts/drills/proxy-guardian-<TIMESTAMP>.json
```

**Signature Verification (minisign):**
```bash
# Prerequisite: brew install minisign
# Verify a receipt's signature
minisign -V -p ai-companion-proxy-starter/keys/guardian.pub -m ai-companion-proxy-starter/artifacts/drills/<file>.json
```
