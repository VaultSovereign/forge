# Forge Day 1–2: Auto-prev Chains & Streaming Ledger Binding

This uplift extends the FORGE: SYNTHESIS patch with three operator-facing additions:

- **Reality Ledger auto-prev cache** — every execution automatically chains to the prior hash for the same UTC day.
- **Workbench SSE endpoint** — `/v3/run/stream` streams execution milestones and final ledger receipts.
- **Forge Run panel** — the frontend now exposes a live runner that binds executions to the ledger in one click.

## Runtime Flow

1. The CLI or BFF route calls `executeAndBindWithPrev()`.
2. The helper consults `ledger/.last-hash.json` to reuse the most recent hash for that day.
3. Execution proceeds via `TemplateExecutor`, emitting canonical envelopes and hashes.
4. Successful runs update the cache, guaranteeing perfect intra-day hash chains.

## Try It

```bash
# Start the Forge BFF (port 8787)
node workbench/bff/src/server.v3.ts

# Trigger a streaming run from the shell
make forge-run-stream KEYWORD=guardrails-check \
  ARGS='{"templateYaml":"id:x\nversion:1.0.0\nkeyword:test\ninputs:[]\nprompts:{system:"ok",user:"hi"}"}'
```

Inspect the day shard:

```bash
cat ledger/events-$(date -u +%F).jsonl
```

You should see consecutive `prev` hashes within the same day.

## UI Walkthrough

1. Start the frontend (`pnpm -C workbench/frontend dev`) and open the Command Center.
2. Navigate to **Forge Run** in the sidebar.
3. Provide a keyword, optional args JSON, and press **Run & Bind**.
4. Watch the SSE log update through resolve → render → call-llm → append-ledger → done.
5. The final entry exposes the canonical hash and ledger shard path.

## Next Steps

- Persist per-day caches for additional metadata (execution counts, receipts).
- Extend the SSE stream to surface provider routing and guardrail verdicts.
- Attach ledger hashes to witness receipts for dual proof (ledger + receipts engine).
