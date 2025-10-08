# Forge Upgrade Guide (v2 uplift)

This guide captures how to wire the additive Forge uplift modules into existing flows without breaking compatibility.

## 1. Canonical ledger hashing

**File:** `reality_ledger/node.ts`

```ts
import { canonicalizeToJSON, stableEventEnvelope } from '../lib/c14n.js';
import { sha256 } from '../lib/hash.js';

const envelope = stableEventEnvelope({
  id,
  ts,
  type,
  actor,
  traceId,
  payload,
  prev,
  dayRoot,
});
const hash = sha256(canonicalizeToJSON(envelope));
```

Persist `envelope` (not the mutable input) to the JSONL log for deterministic hashes.

## 2. Provider fallback

**File:** `dispatcher/modelProvider.ts`

```ts
import { ProviderManager } from '../dispatcher/providerFallback.js';
import { RetriableError } from '../dispatcher/types.js';

const manager = new ProviderManager({ baseTimeoutMs: 60_000 });
manager.register(openAIProvider, 3);
manager.register(openRouterProvider, 2);
manager.register(ollamaProvider, 1);

const result = await manager.call({ model, messages, temperature: 0.2, maxTokens: 1500 });
if (!result.ok) throw result.error;
```

Emit `new RetriableError('rate_limit')` inside providers to trigger fallback instead of a hard failure.

## 3. BFF SSE hygiene

**File:** `workbench/bff/src/server.ts`

```ts
import { initSse } from '../sse.js';

app.get('/v1/sse/execute', async (req, reply) => {
  const sse = initSse(req, reply, { route: 'templates/execute', traceId });
  sse.send('progress', { step: 'start' });
  // stream intermediate updates
  sse.send('done', { ok: true });
  sse.close();
});
```

## 4. Frontend SSE client

Swap bespoke `EventSource` logic for the new hook:

```tsx
import { useSse } from '../hooks/useSse';

const { messages, status } = useSse('/v1/sse/execute', (event) => {
  console.log(event);
});
```

## 5. Template validation

Run locally or in CI to ensure ritual clauses align with `schemas/template.schema.json`:

```bash
pnpm add -D ajv yaml
node scripts/validate-templates.mjs
```

## 6. Receipts & rollups

Use the zero-dependency scripts for deterministic receipts:

```bash
node scripts/witness.v2.js
bash scripts/rollup.v2.sh
```

## 7. Ledger indexing & verification

```bash
node cli/vm.ts index-ledger ./ledger
node cli/vm.ts verify-ledger ./ledger
```

## 8. Pre-push ritual

```bash
bash scripts/forge-prepush.v2.sh
```

This runs typechecks, template validation, advisory security scans, and produces fresh receipts.
