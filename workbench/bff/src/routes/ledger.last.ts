import type { FastifyInstance } from 'fastify';
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { once } from 'node:events';

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function registerLedgerLastRoutes(app: FastifyInstance, opts: { ledgerDir?: string } = {}) {
  const ledgerDir = opts.ledgerDir ?? path.resolve('ledger');

  app.get('/v1/ledger/last', async (request) => {
    const day = (request.query as { day?: string } | undefined)?.day || todayUTC();
    const file = path.join(ledgerDir, `events-${day}.jsonl`);
    try {
      await fs.access(file);
    } catch {
      return { ok: true, day, hasFile: false };
    }

    const stream = createReadStream(file, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    let last: unknown = null;
    rl.on('line', (line) => {
      try {
        last = JSON.parse(line);
      } catch {
        // ignore malformed lines
      }
    });
    await once(rl, 'close');
    return { ok: true, day, hasFile: true, last };
  });
}
