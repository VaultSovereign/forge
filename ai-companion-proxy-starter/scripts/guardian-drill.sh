#!/usr/bin/env bash
set -euo pipefail

# Guardian Drill — 60-sec health & access check for AI Companion Proxy
# Run: ./scripts/guardian-drill.sh or make proxy-drill

# Receipt emission setup
STAMP_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
RUN_ID="$(date -u +"%Y%m%dT%H%M%SZ")"
ART_DIR="${ART_DIR:-artifacts/drills}"
mkdir -p "$ART_DIR"

# Helper: best-available hash (BLAKE3 > SHA256)
hash_file() {
  local f="$1"
  if command -v b3sum >/dev/null 2>&1; then
    b3sum "$f" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$f" | awk '{print $1}'
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$f" | awk '{print $1}'
  else
    echo "UNAVAILABLE"
  fi
}

echo "🛡️  Guardian Drill — AI Companion Proxy Health & Access Check"
echo "=================================================="
echo ""

PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "unknown")
REGION="europe-west3"
SERVICE="ai-companion-proxy"

# 0) Who can invoke (fast audit)
echo "📋 Step 0: IAM Policy Audit"
echo "---"
gcloud run services get-iam-policy "$SERVICE" --region="$REGION" \
  --format='table(bindings.role, bindings.members)' || echo "⚠️  No explicit bindings (uses default permissions)"
echo ""

# 1) Get service URL
echo "🔗 Step 1: Service URL"
echo "---"
AUD=$(gcloud run services describe "$SERVICE" --region="$REGION" --format='value(status.url)')
echo "Service URL: $AUD"
echo ""

# 2) Auth-required negative test (should 403)
echo "🚫 Step 2: Negative Test (no token, should 403)"
echo "---"
HTTP_NEG=$(curl -s -o /dev/null -w "%{http_code}" "$AUD/health")
NEGATIVE_OK="false"
if [ "$HTTP_NEG" = "403" ]; then
  echo "✅ Auth enforcement working (HTTP 403)"
  NEGATIVE_OK="true"
else
  echo "⚠️  Expected 403, got HTTP $HTTP_NEG"
fi
echo ""

# 3) Authenticated health check (should 200)
echo "🔐 Step 3: Authenticated Health Check (should 200)"
echo "---"
TOKEN=$(gcloud auth print-identity-token 2>/dev/null || echo "")
if [ -z "$TOKEN" ]; then
  echo "⚠️  No identity token available. Run: gcloud auth application-default login"
  exit 1
fi

RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -H "Authorization: Bearer $TOKEN" "$AUD/health")
HTTP_AUTH=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")

AUTH_OK="false"
if [ "$HTTP_AUTH" = "200" ]; then
  echo "✅ Authenticated health check passed (HTTP 200)"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
  AUTH_OK="true"
else
  echo "❌ Health check failed (HTTP $HTTP_AUTH)"
  echo "$BODY"
fi
echo ""

# Emit receipt
RECEIPT_PATH="$ART_DIR/proxy-guardian-$RUN_ID.json"
DRILL_STATUS="OPERATIONAL"
if [ "$NEGATIVE_OK" != "true" ] || [ "$AUTH_OK" != "true" ]; then
  DRILL_STATUS="DEGRADED"
fi

# Build JSON with jq if available; otherwise write minimal JSON
if command -v jq >/dev/null 2>&1; then
  jq -n \
    --arg id "proxy.guardian.$RUN_ID" \
    --arg ts "$STAMP_UTC" \
    --arg project "$PROJECT_ID" \
    --arg region "$REGION" \
    --arg service "$SERVICE" \
    --arg aud "$AUD" \
    --argjson http_negative "$HTTP_NEG" \
    --argjson http_auth "$HTTP_AUTH" \
    --arg neg_ok "$NEGATIVE_OK" \
    --arg auth_ok "$AUTH_OK" \
    --arg status "$DRILL_STATUS" \
    '{
      kind: "vaultmesh.receipt.guardian_drill.v1",
      id: $id,
      ts: $ts,
      project: $project,
      region: $region,
      service: $service,
      audience: $aud,
      checks: {
        auth_enforced: { expect: 403, got: $http_negative, ok: ($neg_ok=="true") },
        health_auth:   { expect: 200, got: $http_auth,    ok: ($auth_ok=="true") }
      },
      status: $status
    }' > "$RECEIPT_PATH"
else
  cat > "$RECEIPT_PATH" <<EOF
{
  "kind":"vaultmesh.receipt.guardian_drill.v1",
  "id":"proxy.guardian.$RUN_ID",
  "ts":"$STAMP_UTC",
  "project":"$PROJECT_ID",
  "region":"$REGION",
  "service":"$SERVICE",
  "audience":"$AUD",
  "checks":{
    "auth_enforced":{"expect":403,"got":$HTTP_NEG,"ok":"$NEGATIVE_OK"},
    "health_auth":{"expect":200,"got":$HTTP_AUTH,"ok":"$AUTH_OK"}
  },
  "status":"$DRILL_STATUS"
}
EOF
fi

HASH="$(hash_file "$RECEIPT_PATH")"

# --- Alerting: Slack + GitHub Actions + fail-fast on DEGRADED ---
STATUS_JSON="$(jq -r '.status' "$RECEIPT_PATH" 2>/dev/null || echo "")"

# Build a compact message (works with or without jq details)
if command -v jq >/dev/null 2>&1; then
  AUTH_OK_JSON="$(jq -r '.checks.health_auth.ok' "$RECEIPT_PATH" 2>/dev/null || echo "")"
  ENF_OK_JSON="$(jq -r '.checks.auth_enforced.ok' "$RECEIPT_PATH" 2>/dev/null || echo "")"
else
  AUTH_OK_JSON=""
  ENF_OK_JSON=""
fi

if [ "$STATUS_JSON" != "OPERATIONAL" ]; then
  MSG="⚠️ Guardian Drill DEGRADED — service=${SERVICE:-ai-companion-proxy} region=${REGION:-europe-west3} receipt=$(basename "$RECEIPT_PATH") auth_ok=${AUTH_OK_JSON} enforced_ok=${ENF_OK_JSON}"

  # 1) GitHub Actions annotation (visible in CI logs / checks)
  if [ -n "${GITHUB_ACTIONS:-}" ]; then
    echo "::error title=Guardian Drill DEGRADED::$MSG"
  fi

  # 2) Slack webhook with rate limiting (5-minute cooldown)
  if [ -n "${VM_SLACK_WEBHOOK_URL:-}" ]; then
    LAST_ALERT_FILE="/tmp/guardian-last-alert-ts"
    NOW=$(date +%s)
    LAST=$(cat "$LAST_ALERT_FILE" 2>/dev/null || echo 0)
    COOLDOWN=300  # 5 minutes

    if [ $((NOW - LAST)) -lt $COOLDOWN ]; then
      echo "⏱️  Alert cooldown active (last sent $((NOW - LAST))s ago), skipping Slack post"
    else
      if command -v jq >/dev/null 2>&1; then
        # Build rich Slack blocks payload
        svc="${SERVICE:-ai-companion-proxy}"
        reg="${REGION:-europe-west3}"
        rec="$(basename "$RECEIPT_PATH")"
        status="$STATUS_JSON"
        auth_ok="${AUTH_OK_JSON:-unknown}"
        enf_ok="${ENF_OK_JSON:-unknown}"
        url="${AUD:-}"

        payload="$(jq -n --arg status "$status" --arg svc "$svc" --arg reg "$reg" \
          --arg rec "$rec" --arg url "$url" --arg auth "$auth_ok" --arg enf "$enf_ok" \
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
        curl -s -X POST -H 'Content-type: application/json' --data "$payload" \
          "$VM_SLACK_WEBHOOK_URL" >/dev/null || true
      else
        # Fallback for environments without jq
        curl -s -X POST -H 'Content-type: application/json' \
          --data "{\"text\":\"$MSG\"}" "$VM_SLACK_WEBHOOK_URL" >/dev/null || true
      fi
      echo "$NOW" > "$LAST_ALERT_FILE"
    fi
  fi

  # 3) Fail fast
  exit 1
fi

# Determine hash algorithm used
ALG="BLAKE3"
if ! command -v b3sum >/dev/null 2>&1; then
  if command -v shasum >/dev/null 2>&1 || command -v sha256sum >/dev/null 2>&1; then
    ALG="SHA256"
  else
    ALG="UNKNOWN"
  fi
fi

# Append provenance in a separate sidecar
echo "receipt_file: $(basename "$RECEIPT_PATH")"      >  "$RECEIPT_PATH.prov"
echo "hash_alg: $ALG"                                 >> "$RECEIPT_PATH.prov"
echo "hash_hex: $HASH"                                >> "$RECEIPT_PATH.prov"
echo "emitted_at_utc: $STAMP_UTC"                     >> "$RECEIPT_PATH.prov"

if command -v minisign >/dev/null 2>&1 && [ -f "ai-companion-proxy-starter/keys/guardian.key" ]; then
  minisign -S -s ai-companion-proxy-starter/keys/guardian.key -m "$RECEIPT_PATH" -x "$RECEIPT_PATH.minisig" >/dev/null 2>&1 || true
  echo "🖋  Sig:  $RECEIPT_PATH.minisig"
fi

# Summary
echo "=================================================="
if [ "$AUTH_OK" = "true" ] && [ "$NEGATIVE_OK" = "true" ]; then
  echo "✅ Guardian Drill Complete"
  EXIT_CODE=0
else
  echo "⚠️  Guardian Drill Complete (with warnings)"
  EXIT_CODE=1
fi
echo "   - Service: $SERVICE (region: $REGION)"
echo "   - Auth enforcement: $([ "$NEGATIVE_OK" = "true" ] && echo "✅" || echo "⚠️") (403 without token)"
echo "   - Authenticated access: $([ "$AUTH_OK" = "true" ] && echo "✅" || echo "⚠️") (200 with token)"
echo "   - Status: $DRILL_STATUS"
echo ""
echo "🧾 Receipt: $RECEIPT_PATH"
echo "🔏 Hash ($ALG): $HASH"
echo ""
echo "💡 To grant access to a service account:"
echo "   CALLER_SA=\"caller@${PROJECT_ID}.iam.gserviceaccount.com\""
echo "   gcloud run services add-iam-policy-binding $SERVICE \\"
echo "     --region=$REGION --member=\"serviceAccount:\${CALLER_SA}\" \\"
echo "     --role=\"roles/run.invoker\""
echo ""

exit $EXIT_CODE
