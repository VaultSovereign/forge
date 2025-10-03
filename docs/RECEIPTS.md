# Guardian Drill Receipts

This document outlines the structure, verification, and operational cadence for the Guardian Drill receipts, which serve as a verifiable audit trail for the AI Companion Proxy's health and security posture.

## 1. Receipt Schema

Every time the Guardian Drill runs (e.g., via `make proxy-drill`), it generates a signed JSON receipt that conforms to a strict schema. This ensures that all audit records are consistent and contain the necessary information for verification.

- **Schema Location:** `ai-companion-proxy-starter/schemas/guardian-drill.receipt.schema.json`
- **Canonical Example:**
  ```json
  {
    "kind": "vaultmesh.receipt.guardian_drill.v1",
    "id": "proxy.guardian.20251003T010855Z",
    "ts": "2025-10-03T01:08:55Z",
    "project": "vaultmesh-473618",
    "region": "europe-west3",
    "service": "ai-companion-proxy",
    "audience": "https://ai-companion-proxy-2llr4a5w3a-ew.a.run.app",
    "checks": {
      "auth_enforced": {
        "expect": 403,
        "got": 403,
        "ok": true
      },
      "health_auth": {
        "expect": 200,
        "got": 200,
        "ok": true
      }
    },
    "status": "OPERATIONAL"
  }
  ```

## 2. Verification Commands

A set of `make` targets are provided to easily manage and verify the integrity of these receipts.

### Validate Schema

To ensure the 10 most recent receipts conform to the JSON schema:

```bash
make proxy-receipts-validate
```

This command uses `ajv` to validate the files and will exit with an error if any receipt is malformed.

### Verify Hashes & Signatures

To verify the cryptographic integrity of the receipts:

**1. Verify File Hashes:**

This command checks the BLAKE3 (or SHA256 fallback) hash of the 10 most recent receipt files.

```bash
make proxy-receipts-verify
```

**2. Inspect the Latest Receipt:**

To view the freshest receipt, its provenance footprint, cryptographic hashes, and signature verification (when `minisign` keys are present):

```bash
make proxy-receipts-latest
```

This helper prints the JSON receipt (using `jq` when available), displays the `.prov` metadata, replays the hash for both files, verifies the `.minisig` signature, and surfaces the corresponding `root-YYYY-MM-DD.json` Merkle rollup if it already exists.

**3. Verify Ed25519 Signatures:**

Each receipt is signed using `minisign`, creating a `.minisig` file. To verify a signature, you need the public key (`guardian.pub`).

```bash
# One-time setup
sudo apt-get update && sudo apt-get install -y minisign    # or: brew install minisign
mkdir -p ai-companion-proxy-starter/keys
minisign -G -p ai-companion-proxy-starter/keys/guardian.pub \
         -s ai-companion-proxy-starter/keys/guardian.key

# Verify a single receipt
minisign -V -p ai-companion-proxy-starter/keys/guardian.pub \
  -m ai-companion-proxy-starter/artifacts/drills/<file>.json \
  -x ai-companion-proxy-starter/artifacts/drills/<file>.json.minisig
```

The `guardian-drill.sh` script automatically signs new receipts if `minisign` is available and a `guardian.key` is found in `ai-companion-proxy-starter/keys/`.

## 3. Merkle Rollup

For long-term, efficient verification, a Merkle root is calculated daily across all receipts generated on that day. This creates a single, immutable hash representing the entire day's audit trail.

- **Run Manually:**
  ```bash
  make proxy-receipts-root
  ```
- **Output:** A `root-YYYY-MM-DD.json` file is created in `ai-companion-proxy-starter/artifacts/roots/`, containing the Merkle root, the number of leaves (receipts), and a summary of the files hashed that day.

## 4. Operational Cadence & Automation

- **Nightly Drill:** The `.github/workflows/proxy-smoke-test.yml` GitHub Actions workflow runs the Guardian Drill nightly.
- **Alerting:** If the drill results in a `DEGRADED` status, the workflow will fail, providing a clear signal of a potential issue. The drill emits GitHub Actions annotations and optional Slack webhooks. See [GUARDIAN_ALERTING.md](GUARDIAN_ALERTING.md) for configuration details.
- **Garbage Collection:** A garbage collection target is provided to prune old receipts, keeping the latest 100 by default.
  ```bash
  make proxy-receipts-gc
  ```

This system provides a robust, multi-layered approach to ensuring the AI Companion Proxy remains secure, available, and auditable.