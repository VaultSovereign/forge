import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { once } from 'node:events';
import { canonicalize } from '../lib/c14n.js';
import { sha256 } from '../lib/hash.js';
import { getLogger } from '../lib/logger.js';

export interface IndexRecord {
  day: string;
  type: string;
  offset: number;
  length?: number;
  hash: string;
  ts: string;
}

export interface LedgerIndex {
  version: 1;
  createdAt: string;
  ledgerDir: string;
  byType: Record<string, IndexRecord[]>;
  filesByDay: Record<string, string>;
}

export class LedgerIndexer {
  private readonly log = getLogger({ module: 'ledger-indexer' });
  private readonly ledgerDir: string;

  constructor(ledgerDir: string) {
    this.ledgerDir = ledgerDir;
  }

  private dayFromFilename(file: string): string | null {
    const m = file.match(/events-(\d{4}-\d{2}-\d{2})\.jsonl$/);
    return m ? m[1] : null;
  }

  async listDayFiles(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.ledgerDir);
      return entries
        .filter((f) => /^events-\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
        .sort();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.log.warn({ ledgerDir: this.ledgerDir }, 'Ledger directory missing');
        return [];
      }
      throw error;
    }
  }

  async build(): Promise<LedgerIndex> {
    await fs.mkdir(this.ledgerDir, { recursive: true });

    const byType: Record<string, IndexRecord[]> = {};
    const filesByDay: Record<string, string> = {};

    const files = await this.listDayFiles();
    this.log.info({ files }, 'Indexing ledger day files');

    for (const f of files) {
      const day = this.dayFromFilename(f);
      if (!day) continue;
      const full = path.join(this.ledgerDir, f);
      filesByDay[day] = full;
      await this.indexFile(full, day, byType);
    }

    for (const t of Object.keys(byType)) {
      byType[t].sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
    }

    const index: LedgerIndex = {
      version: 1,
      createdAt: new Date().toISOString(),
      ledgerDir: this.ledgerDir,
      byType,
      filesByDay,
    };

    const idxPath = path.join(this.ledgerDir, 'index.json');
    await fs.writeFile(idxPath, JSON.stringify(index, null, 2));
    this.log.info({ idxPath }, 'Wrote ledger index');
    return index;
  }

  private async indexFile(filePath: string, day: string, byType: Record<string, IndexRecord[]>) {
    const rs = createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: rs, crlfDelay: Infinity });

    let offset = 0;
    rl.on('line', (line) => {
      const length = Buffer.byteLength(line, 'utf8') + 1;
      try {
        const obj = JSON.parse(line);
        const type = String(obj.type ?? 'unknown');
        const ts = String(obj.ts ?? '');
        const hash = sha256(JSON.stringify(canonicalize(obj)));
        const rec: IndexRecord = { day, type, offset, length, hash, ts };
        if (!byType[type]) byType[type] = [];
        byType[type].push(rec);
      } catch (error) {
        this.log.warn({ filePath, offset, err: String(error) }, 'Skipping invalid json line');
      }
      offset += length;
    });

    await once(rl, 'close');
  }
}

export async function buildLedgerIndex(dir = process.env.FORGE_LEDGER_DIR || path.resolve('ledger')) {
  const idx = new LedgerIndexer(dir);
  return idx.build();
}
