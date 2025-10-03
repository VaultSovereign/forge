#!/usr/bin/env bash
set -euo pipefail
: "${BILLING_ACCOUNT:?Set BILLING_ACCOUNT=XXXXXX in env}"
gcloud beta billing budgets create \
  --billing-account="$BILLING_ACCOUNT" \
  --display-name="AI Companion Promo Burn" \
  --budget-amount=2200EUR \
  --threshold-rule=percent=0.25 \
  --threshold-rule=percent=0.50 \
  --threshold-rule=percent=0.90 || true

