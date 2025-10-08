# Incantations — Composed Rituals

Incantations let you orchestrate **multiple templates** in a defined order and record each execution in the Reality Ledger. Use them for bundled audits or repeatable compliance walkthroughs.

## Files Added

- `forge/incantations/audit-suite.yaml` — sample suite chaining a Guardrails check with the DORA ICT risk framework.
- `forge/cli/incantation-run.ts` — CLI runner that executes every step and binds the results with automatic prev hashing.
- `forge/workbench/bff/src/routes/metrics.v1.ts` — lightweight metrics endpoint returning ledger counts and last ROOT.
- `forge/workbench/bff/src/server.metrics8787.ts` — convenience server that exposes templates, exec-bind, ledger last, and metrics on port 8787.
- `forge/workbench/frontend/src/components/MetricsStrip.tsx` — UI strip that polls `/metrics/forge` for real-time stats.

## Incantations CLI

List available suites:

```bash
node forge/cli/incantation-run.ts list
```

Execute a suite:

```bash
node forge/cli/incantation-run.ts run audit-suite
```

Options:

- `--dir` — override the incantations directory (defaults to `forge/incantations`).
- `--model` — pin a model for all steps unless a step defines its own.
- `--ledgerDir` — write ledger output to a different location.
- `--actor` — set a custom actor label in the ledger event payloads.

Each step is executed sequentially with a shared trace ID so downstream analysis can follow the entire ritual.

## Metrics Strip

Start the metrics-friendly BFF:

```bash
node forge/workbench/bff/src/server.metrics8787.ts
```

Query metrics directly:

```bash
curl http://localhost:8787/metrics/forge | jq
```

Mount the React component inside the dashboard:

```tsx
import MetricsStrip from './components/MetricsStrip';

function Shell() {
  return (
    <div>
      <MetricsStrip />
      {/* rest of the UI */}
    </div>
  );
}
```

The response includes:

- `day` — the UTC day shard for the ledger file.
- `eventsToday` — count of executions captured in the shard.
- `lastRoot` — latest receipt root (if available).
- `ts` — server timestamp of the snapshot.

Use these signals to confirm automations are active and receipts are being sealed without needing full Prometheus plumbing.
