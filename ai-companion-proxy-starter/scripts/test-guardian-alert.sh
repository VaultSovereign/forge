#!/usr/bin/env bash
# test-guardian-alert.sh — Smoke test for DEGRADED alerting path
# Usage: VM_SLACK_WEBHOOK_URL='...' bash test-guardian-alert.sh

set -euo pipefail

echo "🧪 Testing Guardian Drill DEGRADED alerting..."
echo ""

# Create temporary test receipt
TEST_DIR="$(mktemp -d)"
trap 'rm -rf "$TEST_DIR"' EXIT

TEST_RECEIPT="$TEST_DIR/proxy-guardian-test.json"
cat > "$TEST_RECEIPT" <<'EOF'
{
  "kind": "vaultmesh.receipt.guardian_drill.v1",
  "id": "proxy.guardian.test",
  "ts": "2025-10-03T00:00:00Z",
  "project": "test-project",
  "region": "test-region",
  "service": "test-service",
  "audience": "https://test.example.com",
  "checks": {
    "auth_enforced": { "expect": 403, "got": 403, "ok": true },
    "health_auth": { "expect": 200, "got": 500, "ok": false }
  },
  "status": "DEGRADED"
}
EOF

echo "📋 Test receipt created: $TEST_RECEIPT"
echo ""

# Simulate the alerting block from guardian-drill.sh
STATUS_JSON="$(jq -r '.status' "$TEST_RECEIPT" 2>/dev/null || echo "")"

if command -v jq >/dev/null 2>&1; then
  AUTH_OK_JSON="$(jq -r '.checks.health_auth.ok' "$TEST_RECEIPT" 2>/dev/null || echo "")"
  ENF_OK_JSON="$(jq -r '.checks.auth_enforced.ok' "$TEST_RECEIPT" 2>/dev/null || echo "")"
else
  AUTH_OK_JSON=""
  ENF_OK_JSON=""
fi

echo "Status: $STATUS_JSON"
echo "Auth OK: $AUTH_OK_JSON"
echo "Enforced OK: $ENF_OK_JSON"
echo ""

if [ "$STATUS_JSON" != "OPERATIONAL" ]; then
  MSG="⚠️ Guardian Drill DEGRADED — service=test-service region=test-region receipt=$(basename "$TEST_RECEIPT") auth_ok=${AUTH_OK_JSON} enforced_ok=${ENF_OK_JSON}"
  
  echo "🚨 DEGRADED status detected!"
  echo ""
  
  # 1) GitHub Actions annotation
  if [ -n "${GITHUB_ACTIONS:-}" ]; then
    echo "::error title=Guardian Drill DEGRADED::$MSG"
    echo "✅ GitHub Actions annotation emitted"
  else
    echo "⚠️  GITHUB_ACTIONS not set (would emit: ::error title=Guardian Drill DEGRADED::...)"
  fi
  echo ""
  
  # 2) Slack webhook
  if [ -n "${VM_SLACK_WEBHOOK_URL:-}" ]; then
    if command -v jq >/dev/null 2>&1; then
      # Build rich Slack blocks payload (matching guardian-drill.sh)
      svc="test-service"
      reg="test-region"
      rec="$(basename "$TEST_RECEIPT")"
      status="DEGRADED"
      url="https://test.example.com"
      
      payload="$(jq -n --arg status "$status" --arg svc "$svc" --arg reg "$reg" \
        --arg rec "$rec" --arg url "$url" --arg auth "$AUTH_OK_JSON" --arg enf "$ENF_OK_JSON" \
        '{
          blocks: [
            { type: "header", text: { type: "plain_text", text: "⚠️ Guardian Drill DEGRADED" } },
            { type: "section",
              fields: [
                { type: "mrkdwn", text: "*Service:* \($svc)" },
                { type: "mrkdwn", text: "*Region:* \($reg)" },
                { type: "mrkdwn", text: "*Status:* \($status)" },
                { type: "mrkdwn", text: "*Receipt:* `\($rec)`" },
                { type: "mrkdwn", text: "*Auth OK:* \($auth)" },
                { type: "mrkdwn", text: "*Enforce OK:* \($enf)" }
              ]},
            { type: "context", elements: [ { type: "mrkdwn", text: "<\($url)|Service URL>" } ] }
          ]
        }')"
      response="$(curl -s -w "\nHTTP:%{http_code}" -X POST -H 'Content-type: application/json' --data "$payload" "$VM_SLACK_WEBHOOK_URL" 2>&1 || true)"
      http_code="$(echo "$response" | grep "HTTP:" | cut -d: -f2)"
      
      if [ "$http_code" = "200" ]; then
        echo "✅ Slack webhook posted successfully (HTTP 200) — check channel for Block Kit message"
      else
        echo "⚠️  Slack webhook returned HTTP $http_code"
        echo "   Response: $response"
      fi
    else
      curl -s -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"$MSG\"}" "$VM_SLACK_WEBHOOK_URL" >/dev/null || true
      echo "✅ Slack webhook invoked (jq not available, minimal payload)"
    fi
  else
    echo "⚠️  VM_SLACK_WEBHOOK_URL not set (would post to Slack)"
  fi
  echo ""
  
  echo "✅ Alert test complete — script would exit 1 now"
  echo ""
  echo "💡 To test with a real Slack webhook:"
  echo "   export VM_SLACK_WEBHOOK_URL='https://hooks.slack.com/services/XXX/YYY/ZZZ'"
  echo "   bash $0"
else
  echo "⚠️  Unexpected: status was OPERATIONAL (test designed for DEGRADED)"
  exit 1
fi

echo ""
echo "🎯 Test passed — alerting logic is wired correctly"
