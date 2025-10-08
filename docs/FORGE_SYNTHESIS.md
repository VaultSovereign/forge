# FORGE: SYNTHESIS — Template Execution Bound to Reality Ledger

This phase connects the `TemplateExecutor` to the `Reality Ledger`, so every execution becomes a signed, hashed, and append-only event.

## Files Added

- `forge/executor/ledgerBinder.ts` — Binds `exec()` results to `ledger/events-YYYY-MM-DD.jsonl` with deterministic hashing.
- `forge/cli/forge-run.ts` — CLI to run `keyword` and auto-append a `forge.execution` event.

## Usage

### 1) Run a keyword and bind to ledger
```bash
node forge/cli/forge-run.ts run guardrails-check --args '{"templateYaml":"id:x\nversion:1.0.0\nkeyword:test\ninputs:[]\nprompts:{system:\"ok\",user:\"hi\"}"}'
```
Output (truncated):
```json
{
  "ok": true,
  "exec": { "ok": true, "templateId": "tem.guardrails.checker", "output": "..." },
  "day": "2025-10-08",
  "hash": "9b4f...",
  "file": "/path/to/repo/ledger/events-2025-10-08.jsonl"
}
```

### 2) Verify the ledger day and build index (from previous uplifts)
```bash
node forge/cli/vm.ts verify-ledger ./ledger
node forge/cli/vm.ts index-ledger ./ledger
```

### 3) Receipts and roots (from previous uplifts)
```bash
node forge/scripts/witness.v2.js
bash forge/scripts/rollup.v2.sh
```

## Envelope Contract

The binder writes a canonical envelope per execution:
```jsonc
{
  "id": "<uuid>",
  "ts": "<ISO>",
  "type": "forge.execution",
  "actor": "forge",
  "traceId": "<uuid>",
  "payload": {
    "ok": true|false,
    "templateId": "tem.xxx",
    "output": "string|null",
    "meta": {...},
    "error": "string|null",
    "args": {...},
    "model": "string|null"
  },
  "prev": "<optional_prev_hash>",
  "hash": "<sha256(c14n(envelope))>"
}
```

## Notes

- The binder records both successes and failures (`ok: false`) with the same contract.
- `prev` is accepted to chain same-day entries if you maintain a pointer; otherwise omit.
- The hashing is performed over **canonical JSON** (sorted keys, JSON semantics), ensuring cross-platform determinism.

## Next

- Add a small cache to track last hash per day and automatically set `prev` for perfect day-chains.
- Emit a receipt entry referencing the ledger hash for dual proof: *artifact → receipt → ledger*.
