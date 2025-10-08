import path from 'node:path';

import { executeAndBind, type BindOptions, type BindResult } from './ledgerBinder.js';
import { PrevCache } from '../reality_ledger/prevCache.js';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function executeAndBindWithPrev(options: BindOptions): Promise<BindResult> {
  const ledgerDir = options.ledgerDir ?? path.resolve('ledger');
  const cache = new PrevCache(ledgerDir);
  await cache.load();

  const day = today();
  const prev = cache.get(day);
  const result = await executeAndBind({ ...options, prev, ledgerDir });

  if (result.ok && result.hash && result.day) {
    await cache.set(result.day, result.hash);
  }

  return result;
}
