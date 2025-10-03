#!/bin/bash
set -euo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "Usage: $0 <domain> <dns-zone> [region]" >&2
  exit 1
fi

DOMAIN="$1"
ZONE="$2"
REGION="${3:-europe-west3}"
TTL="${TTL:-300}"

TMP_DIR="$(mktemp -d)"
cleanup_tmp() { rm -rf "$TMP_DIR"; }
trap cleanup_tmp EXIT

JSON_FILE="$TMP_DIR/domain.json"

echo "Fetching domain mapping details for ${DOMAIN} in ${REGION}..."
gcloud run domain-mappings describe "$DOMAIN" --region "$REGION" --format=json > "$JSON_FILE"

if [[ $(jq '.resourceRecords | length' "$JSON_FILE") -eq 0 ]]; then
  echo "No resourceRecords found in domain mapping response. Ensure the mapping exists and retry." >&2
  exit 1
fi

readarray -t RECORDS < <(jq -r '.resourceRecords[] | "\(.type)|\(.name)|\(.rrdata)"' "$JSON_FILE")

echo "Starting DNS transaction in zone ${ZONE}..."
gcloud dns record-sets transaction start --zone="$ZONE" >/dev/null

cleanup_transaction() {
  gcloud dns record-sets transaction abort --zone="$ZONE" >/dev/null || true
}
trap cleanup_transaction ERR

for entry in "${RECORDS[@]}"; do
  IFS='|' read -r TYPE NAME RRDATUM <<<"$entry"

  if [[ "$TYPE" == "TXT" && "${RRDATUM:0:1}" != '"' ]]; then
    RR_TO_ADD="\"${RRDATUM//"/\\\"}\""
  else
    RR_TO_ADD="$RRDATUM"
  fi

  echo "Processing ${TYPE} record for ${NAME} -> ${RR_TO_ADD}"

  EXISTING_JSON=$(gcloud dns record-sets list --zone="$ZONE" --name="$NAME" --type="$TYPE" --format=json) || EXISTING_JSON="[]"
  EXISTING_COUNT=$(jq 'length' <<<"$EXISTING_JSON")

  if [[ "$EXISTING_COUNT" -gt 0 ]]; then
    mapfile -t EXISTING_RRDATAS < <(jq -r '.[0].rrdatas[]' <<<"$EXISTING_JSON")
    EXISTING_TTL=$(jq -r '.[0].ttl' <<<"$EXISTING_JSON")

    for idx in "${!EXISTING_RRDATAS[@]}"; do
      if [[ "$TYPE" == "TXT" && "${EXISTING_RRDATAS[$idx]:0:1}" != '"' ]]; then
        EXISTING_RRDATAS[$idx]="\"${EXISTING_RRDATAS[$idx]//"/\\\"}\""
      fi
    done

    echo "Removing existing ${TYPE} record for ${NAME}"
    gcloud dns record-sets transaction remove \
      --zone="$ZONE" \
      --name="$NAME" \
      --type="$TYPE" \
      --ttl="$EXISTING_TTL" \
      "${EXISTING_RRDATAS[@]}"
  fi

  echo "Adding ${TYPE} record for ${NAME}"
  gcloud dns record-sets transaction add \
    --zone="$ZONE" \
    --name="$NAME" \
    --type="$TYPE" \
    --ttl="$TTL" \
    "$RR_TO_ADD"
done

trap - ERR
echo "Executing DNS transaction..."
gcloud dns record-sets transaction execute --zone="$ZONE"

echo "DNS records for ${DOMAIN} updated successfully."
