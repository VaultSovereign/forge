import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { once } from 'node:events';

import { canonicalize } from '../lib/c14n.js';
import { sha256 } from '../lib/hash.js';

export interface VerifyResult {
  ok: boolean;
  days: number;
  files: number;
  events: number;
  errors: Array<{ day: string; offset: number; reason: string }>;
  dayRoots: Record<string, string>;
}

export async function verifyLedger(dir = path.resolve('ledger')): Promise<VerifyResult> {
  const result: VerifyResult = { ok: true, days: 0, files: 0, events: 0, errors: [], dayRoots: {} };
  const entries = await fs.readdir(dir).catch(() => []);
  const files = entries.filter((f) => /^events-\d{4}-\d{2}-\d{2}\.jsonl$/.test(f)).sort();

  result.files = files.length;
  result.days = new Set(files.map((f) => f.slice(7, 17))).size;

  for (const file of files) {
    const day = file.slice(7, 17);
    const fullPath = path.join(dir, file);
    const stream = createReadStream(fullPath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let offset = 0;
    let previousHash: string | null = null;
    const hashes: string[] = [];

    rl.on('line', (line) => {
      const length = Buffer.byteLength(line, 'utf8') + 1;
      try {
        const parsed = JSON.parse(line);
        const canonical = canonicalize(parsed);
        const currentHash = sha256(JSON.stringify(canonical));
        hashes.push(currentHash);

        const prev = typeof parsed.prev === 'string' ? parsed.prev : null;
        if (prev && previousHash && prev !== previousHash) {
          result.ok = false;
          result.errors.push({ day, offset, reason: `Prev mismatch: expected ${previousHash} got ${prev}` });
        }
        previousHash = currentHash;
        result.events += 1;
      } catch (error) {
        result.ok = false;
        result.errors.push({ day, offset, reason: `Invalid JSON: ${String(error)}` });
      }
      offset += length;
    });

    await once(rl, 'close');
    const dayRoot = sha256(hashes.join(''));
    result.dayRoots[day] = dayRoot;
  }

  return result;
}
