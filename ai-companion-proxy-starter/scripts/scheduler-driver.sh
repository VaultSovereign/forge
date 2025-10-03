#!/usr/bin/env bash
set -euo pipefail
PROJECT_ID=$(gcloud config get-value project)
REGION=${REGION:-europe-west3}
SERVICE=${SERVICE:-ai-companion-proxy}
URL=$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')

gcloud scheduler jobs create http burn-ai-companion \
  --schedule="* * * * *" \
  --uri="${URL}/invoke" \
  --http-method=POST \
  --message-body='{"path":"/<CONFIRMED_METHOD_PATH>","method":"POST","body":{"prompt":"tick"}}' \
  --oidc-service-account-email="${SERVICE}@${PROJECT_ID}.iam.gserviceaccount.com" || \
gcloud scheduler jobs update http burn-ai-companion \
  --schedule="* * * * *" \
  --uri="${URL}/invoke" \
  --http-method=POST \
  --message-body='{"path":"/<CONFIRMED_METHOD_PATH>","method":"POST","body":{"prompt":"tick"}}' \
  --oidc-service-account-email="${SERVICE}@${PROJECT_ID}.iam.gserviceaccount.com"

