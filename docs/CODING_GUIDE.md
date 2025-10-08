# Forge Coding Guide (Uplift Edition)

This document codifies pragmatic standards to keep Forge robust and auditable.

## TypeScript Strictness

- Enable `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `noImplicitOverride` in `tsconfig`.
- Prefer results (`{ ok: true, value } | { ok: false, error }`) for recoverable flows.
- Treat `unknown` at IO edges and validate inputs explicitly.

## Canonicalization & Hashing

Use `lib/c14n.ts` and `lib/hash.ts`:

```ts
import { canonicalizeToJSON } from '../lib/c14n.js';
import { sha256 } from '../lib/hash.js';

const payloadJSON = canonicalizeToJSON(event.payload);
const hash = sha256(payloadJSON);
```

Avoid hashing non-canonical structures.

## Logging & Tracing

Use `lib/logger.ts` and include a `traceId` whenever available:

```ts
import { getLogger } from '../lib/logger.js';
const log = getLogger({ module: 'dispatcher', traceId });
log.info({ type: tpl.type, id: tpl.id }, 'Executing template');
```

## Ledger Indexing

Build the ledger index to accelerate queries:

```bash
node -e 'import("./reality_ledger/indexer.ts").then(m => m.buildLedgerIndex())'
```

This writes `ledger/index.json` mapping types to entries with byte offsets.

## SSE Hygiene

Prefer `workbench/bff/sse.ts` for streaming responses. Send keep-alives every 15 seconds and close on disconnects to avoid orphan work.

## Template Contracts

Validate YAML templates against `schemas/template.schema.json` in CI. Include:

- `id`, `version`, `keyword`
- `inputs[]` with `name`, `type`, `required`
- `risk.level`
- `prompts.system` and `prompts.user`

## Provider Fallbacks

Wrap providers via `dispatcher/providerFallback.ts` to enforce timeouts, circuit breakers, and exponential backoff.

## Receipts

Use `scripts/witness.v2.js` to produce deterministic receipts and Merkle roots. Upload `receipts/forge/<day>/receipt.json`, `receipts/ROOT.txt`, and `receipts/LAST_ROOT.txt` from CI.

## Testing

- Co-locate Vitest specs as `*.test.ts`.
- Avoid real network calls; stub providers.
- Assert canonical hashes for ledger determinism tests.
