# Security Checklist — Slack Webhook Management

## ✅ Immediate Actions (Post-Exposure)

- [x] **Rotate webhook immediately** in Slack workspace settings
- [x] **Verify old webhook returns 404** or invalid response
- [x] **Store new webhook in GitHub Secrets** (`VM_SLACK_WEBHOOK_URL`)
- [x] **Audit repository for hardcoded URLs** — none found
- [x] **Document incident** — see `INCIDENT_2025-10-03_SLACK_WEBHOOK.md`

## ✅ Preventive Measures (Implemented)

- [x] **Never commit webhook URLs** — documented in `GUARDIAN_ALERTING.md`
- [x] **Use GitHub Secrets** for CI/CD workflows
- [x] **Export in shell only** for local testing (never in `.env`)
- [x] **Upgraded to Block Kit** for richer, auditable Slack messages
- [x] **Added test harness** to validate alerting without hitting live service

## 🔄 Ongoing Best Practices

### For Repository Maintainers

1. **Enable GitHub secret scanning** (if not already active)
   ```bash
   # Repository Settings → Security → Code security and analysis
   # Enable: Secret scanning (automatically detect exposed credentials)
   ```

2. **Review webhook permissions** in Slack workspace
   - Incoming webhooks are write-only (cannot read messages)
   - Scope to a dedicated alerts channel (not general/sensitive channels)

3. **Monitor Slack webhook usage**
   - Check Slack App Management → Incoming Webhooks → View logs
   - Watch for unexpected post volume or sources

### For Developers

1. **Never paste webhook URLs in:**
   - Chat logs (use `XXX/YYY/ZZZ` placeholders)
   - Code comments
   - Commit messages
   - Documentation examples

2. **Local testing pattern:**
   ```bash
   # ✅ GOOD: Export in shell session (not persisted)
   export VM_SLACK_WEBHOOK_URL='https://hooks.slack.com/services/...'
   make proxy-drill
   
   # ❌ BAD: Never add to .env (can be accidentally committed)
   echo "VM_SLACK_WEBHOOK_URL=https://..." >> .env
   ```

3. **Rotate on suspicion:**
   - If webhook appears in logs, screenshots, or shared contexts
   - Rotation takes <60 seconds in Slack → Manage Apps

### For CI/CD

1. **Audit secret access:**
   ```bash
   # Check which workflows use the secret
   git grep -l "VM_SLACK_WEBHOOK_URL" .github/workflows/
   ```

2. **Restrict secret access by branch:**
   - GitHub Enterprise: Settings → Secrets → Repository secrets → Edit
   - Limit to `main` or protected branches only

3. **Set up alerting for secret changes:**
   - GitHub audit log: filter for `secret.updated` events
   - Consider SIEM integration for compliance

## 🎯 Webhook Rotation Procedure

### Step 1: Create New Webhook
1. Slack → Manage Apps → Incoming Webhooks
2. Select your app → Add New Webhook to Workspace
3. Choose channel → Authorize
4. Copy new URL (starts with `https://hooks.slack.com/services/...`)

### Step 2: Update GitHub Secret
```bash
# Via GitHub CLI
gh secret set VM_SLACK_WEBHOOK_URL --repo VaultSovereign/forge

# Or via web UI
# Settings → Secrets and variables → Actions → VM_SLACK_WEBHOOK_URL → Update
```

### Step 3: Test New Webhook
```bash
export VM_SLACK_WEBHOOK_URL='<NEW_URL>'
bash ai-companion-proxy-starter/scripts/test-guardian-alert.sh
# Expected: Message appears in Slack channel
```

### Step 4: Revoke Old Webhook
1. Slack → Manage Apps → Incoming Webhooks
2. Find old webhook → Remove
3. Verify old URL returns 404:
   ```bash
   curl -s -X POST -H 'Content-type: application/json' \
     --data '{"text":"test"}' '<OLD_URL>'
   # Expected: "invalid_payload" or 404
   ```

## 📋 Audit Trail

| Date | Action | Performed By |
|------|--------|--------------|
| 2025-10-03 | Initial webhook rotation | Security team |
| 2025-10-03 | Secret scanning enabled | DevOps |
| 2025-10-03 | Block Kit upgrade | Engineering |

---

**Last Updated:** 2025-10-03  
**Next Review:** 2025-11-03 (30-day cadence)
