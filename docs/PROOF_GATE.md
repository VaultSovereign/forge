# Forge Proof Gate

The proof gate demonstrates that a real template execution occurred, appended to the Reality Ledger, and produced receipts that can be shared with reviewers or regulators.

## Components

- **Workflow**: `.github/workflows/forge-run-proof.yml` – runs when a PR gains the `forge-run` label or via manual dispatch.
- **Script**: `scripts/proof-smoke.mjs` – executes a keyword, checks the ledger grew, and writes `receipts/proof/<day>.json`.
- **Makefile**: `Makefile.proof.mk` – helper targets for running the smoke test and sealing receipts locally.
- **BFF convenience servers**: `workbench/bff/src/server.port8787.ts` and `workbench/bff/src/server.port8787.dashboard.ts` – start the API on the dashboard’s expected port.
- **Routes**: `workbench/bff/src/routes/ledger.last.ts` and `workbench/bff/src/routes/dev.dashboard.ts` – serve last-ledger-event data and a zero-build dashboard.

## Local usage

```bash
node workbench/bff/src/server.port8787.ts
make -f Makefile.proof.mk forge-proof \
  KEYWORD=guardrails-check \
  ARGS='{"templateYaml":"id:x\nversion:1.0.0\nkeyword:test\ninputs:[]\nprompts:{system:\"ok\",user:\"hi\"}"}'
make -f Makefile.proof.mk forge-proof-receipts
```

Artifacts to inspect:

- `ledger/events-YYYY-MM-DD.jsonl`
- `receipts/proof/YYYY-MM-DD.json`
- `receipts/ROOT.txt` and `receipts/LAST_ROOT.txt`

## CI usage

1. Push your branch and open a PR.
2. Add the `forge-run` label or run **forge-run-proof** manually from the Actions tab.
3. Inspect the uploaded artifacts; the workflow labels the PR with `proof:ok` on success.

## Why it matters

- **Provable execution** – auditors can see that automation ran, ledgered, and produced receipts.
- **Operational readiness** – simple Make targets and convenience servers match the dashboard expectations.
- **Low risk** – all additions are additive; no existing behavior changes.
