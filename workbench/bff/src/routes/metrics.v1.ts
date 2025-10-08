import type { FastifyInstance } from 'fastify';
import { promises as fs } from 'node:fs';
import path from 'node:path';

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

async function countLines(file: string): Promise<number> {
  try {
    const data = await fs.readFile(file, 'utf8');
    if (!data) {
      return 0;
    }
    return data.split('\n').filter((line) => line.trim().length > 0).length;
  } catch {
    return 0;
  }
}

async function readLastRoot(receiptsDir: string): Promise<string | null> {
  try {
    const file = path.join(receiptsDir, 'ROOT.txt');
    const data = await fs.readFile(file, 'utf8');
    const match = data.match(/^root:(.+)$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

export default async function registerForgeMetricsRoutes(
  app: FastifyInstance,
  options: { ledgerDir?: string; receiptsDir?: string } = {},
): Promise<void> {
  const ledgerDir = options.ledgerDir ?? path.resolve('ledger');
  const receiptsDir = options.receiptsDir ?? path.resolve('receipts');

  app.get('/metrics/forge', async () => {
    const day = todayUTC();
    const ledgerFile = path.join(ledgerDir, `events-${day}.jsonl`);
    const eventsToday = await countLines(ledgerFile);
    const lastRoot = await readLastRoot(receiptsDir);

    return {
      ok: true,
      ts: new Date().toISOString(),
      day,
      eventsToday,
      lastRoot,
    };
  });
}
