#!/bin/bash
set -euo pipefail

# Import existing GCP resources into Terraform state.
# Run this script from the repo root or adjust DIR below.
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ID="${PROJECT_ID:-vaultmesh-473618}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "Error: PROJECT_ID is not set." >&2
  exit 1
fi

cd "$DIR"

echo "--- Initializing Terraform ---"
terraform init

echo "--- Importing DNS Managed Zone ---"
terraform import google_dns_managed_zone.infra "projects/${PROJECT_ID}/managedZones/infra-vaultmesh-cloud"

echo "--- Importing Secret Manager Secrets ---"
SECRETS=(
  "vaultmesh-dev-openrouter"
  "vaultmesh-dev-db-password"
  "vaultmesh-dev-guardian-signing-key"
  "vaultmesh-prod-openrouter"
  "vaultmesh-prod-db-password"
  "vaultmesh-prod-guardian-signing-key"
)

for secret in "${SECRETS[@]}"; do
  echo "Importing secret: ${secret}"
  terraform import "google_secret_manager_secret.secrets[\"${secret}\"]" "projects/${PROJECT_ID}/secrets/${secret}"
done

echo "--- Importing Logging Metric ---"
terraform import google_logging_metric.receipts "projects/${PROJECT_ID}/metrics/vaultmesh-receipts"

echo "--- Import complete. Run 'terraform plan -var-file=envs/dev.tfvars' to review state. ---"
