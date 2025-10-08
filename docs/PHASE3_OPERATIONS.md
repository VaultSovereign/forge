# Forge Phase 3 Operations Playbook

This guide tracks the day-two operations required once the Forge uplift patches are applied. It mirrors the "Polis Alignment" activation instructions shared by Guardian Tem.

## 1. Verification Sweep

Run the full diagnostic sweep after applying fresh changes:

```bash
pnpm test
node scripts/witness.v2.js
bash scripts/rollup.v2.sh
grep '^root:' receipts/ROOT.txt
```

Successful runs emit the current Merkle root and refresh receipts under `receipts/forge/<day>/`.

## 2. Ledger Index Refresh

The indexer can now run directly on the compiled output without additional tooling:

```bash
pnpm run build
node -e 'import("./dist/reality_ledger/indexer.js").then(m => m.buildLedgerIndex())'
```

The command creates `ledger/index.json` (and the parent directory when missing) while logging the files that were indexed.

## 3. Capsule Image Publication

Build and push the devcontainer-compatible image so that development environments stay deterministic:

```bash
docker build -t ghcr.io/vaultsovereign/forge-capsule:node-v2 -f .devcontainer/Dockerfile .
docker push ghcr.io/vaultsovereign/forge-capsule:node-v2
```

> Update `.devcontainer/devcontainer.json` to reference `ghcr.io/vaultsovereign/forge-capsule:node-v2` (see repo change).

## 4. Root Linking Into VaultMesh Core

When both Forge and VaultMesh roots exist, link them so their Merkle chains co-verify:

```bash
bash scripts/root-link.v2.sh receipts /path/to/VaultMesh/receipts/ROOT.txt
```

This emits a timestamped JSON record under `receipts/external-links/` with both roots.

## 5. Daily Covenant Checklist

- [ ] Receipts and roots regenerated (steps above).
- [ ] Ledger index refreshed.
- [ ] Templates validated (`npx ajv ...`).
- [ ] Security gates observed (gitleaks + Trivy in CI).
- [ ] Capsule image rebuilt when dependencies shift.

Forge on. Every hash remains a vow.
