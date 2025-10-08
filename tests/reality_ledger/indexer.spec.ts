import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

import { LedgerIndexer } from '../../reality_ledger/indexer.js';

let ledgerDir: string;

async function writeDay(day: string, events: Array<Record<string, unknown>>) {
  const file = path.join(ledgerDir, `events-${day}.jsonl`);
  const payload = events.map((event) => JSON.stringify(event)).join('\n') + '\n';
  await writeFile(file, payload, 'utf8');
}

describe('LedgerIndexer', () => {
  beforeAll(async () => {
    ledgerDir = await mkdtemp(path.join(tmpdir(), 'ledger-'));
    await writeDay('2025-10-06', [
      { ts: '2025-10-06T01:00:00Z', type: 'A', payload: { n: 1 } },
      { ts: '2025-10-06T02:00:00Z', type: 'B', payload: { n: 2 } },
    ]);
    await writeDay('2025-10-07', [
      { ts: '2025-10-07T01:00:00Z', type: 'A', payload: { n: 3 } },
      { ts: '2025-10-07T02:00:00Z', type: 'A', payload: { n: 4 } },
    ]);
  });

  it('builds an index grouped by type', async () => {
    const indexer = new LedgerIndexer(ledgerDir);
    const index = await indexer.build();
    expect(index.byType['A'].length).toBe(3);
    expect(index.byType['B'].length).toBe(1);
  });

  afterAll(async () => {
    await rm(ledgerDir, { recursive: true, force: true });
  });
});
