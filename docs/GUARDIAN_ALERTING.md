# Guardian Drill Alerting

## Overview

The Guardian Drill script (`ai-companion-proxy-starter/scripts/guardian-drill.sh`) now includes dual-path alerting when a `DEGRADED` status is detected:

1. **GitHub Actions annotation** — emits `::error` in CI logs for immediate visibility
2. **Slack webhook** — posts a compact alert message to a configured channel
3. **Fail-fast exit** — returns exit code 1 to mark the CI run as failed

This ensures no degraded state slips through unnoticed.

## Configuration

### GitHub Actions

The workflow already passes the required environment variable:

```yaml
env:
  VM_SLACK_WEBHOOK_URL: ${{ secrets.VM_SLACK_WEBHOOK_URL }}
  GITHUB_ACTIONS: true
```

Add the secret in your repository/organization settings:
1. Go to **Settings → Secrets and variables → Actions → New repository secret**
2. **Name:** `VM_SLACK_WEBHOOK_URL`
3. **Value:** Your Slack incoming webhook URL (e.g., `https://hooks.slack.com/services/XXX/YYY/ZZZ`)

⚠️ **SECURITY:** Never commit the webhook URL to the repository. Treat it as a secret credential. If accidentally exposed, rotate it immediately in Slack workspace settings.

### Local Testing

Set the webhook URL before running the drill:

```bash
export VM_SLACK_WEBHOOK_URL='https://hooks.slack.com/services/XXX/YYY/ZZZ'
make proxy-drill
```

## Alert Format

### Slack (Block Kit)

When `jq` is available, the Slack alert uses rich Block Kit formatting:

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
│ Service URL (clickable link)        │
└─────────────────────────────────────┘
```

### GitHub Actions

The workflow emits an `::error` annotation visible in the Checks UI:

```
::error title=Guardian Drill DEGRADED::⚠️ Guardian Drill DEGRADED — 
service=ai-companion-proxy region=europe-west3 receipt=proxy-guardian-...json 
auth_ok=false enforced_ok=true
```

## Testing

Use the included smoke test to validate alerting without hitting the live service:

```bash
# Dry-run (shows what would happen)
bash ai-companion-proxy-starter/scripts/test-guardian-alert.sh

# With Slack webhook
export VM_SLACK_WEBHOOK_URL='https://hooks.slack.com/services/XXX/YYY/ZZZ'
bash ai-companion-proxy-starter/scripts/test-guardian-alert.sh
```

This script creates a synthetic `DEGRADED` receipt and exercises both alert paths.

## Behavior

- **OPERATIONAL status:** Script exits 0, no alerts sent
- **DEGRADED status:** 
  - Emits `::error` annotation if `GITHUB_ACTIONS` is set
  - Posts to Slack if `VM_SLACK_WEBHOOK_URL` is set
  - Exits with code 1 (fails the CI job)

## Future Enhancements

- **Rate limiting:** ✅ **IMPLEMENTED** — 5-minute cooldown between Slack posts to prevent alert storms during extended outages
- **Thread replies:** Use Slack thread API to group related alerts (requires Slack app + OAuth token instead of incoming webhook)
- **Receipt attachment:** Include full receipt JSON as a file attachment (requires Slack app with `files:write` scope)
- **Incident tracking:** Auto-create PagerDuty/Opsgenie incidents on `DEGRADED` status
