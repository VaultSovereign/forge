import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface PrevState {
  [day: string]: string;
}

export class PrevCache {
  private readonly file: string;
  private state: PrevState = {};

  constructor(ledgerDir = path.resolve('ledger')) {
    this.file = path.join(ledgerDir, '.last-hash.json');
  }

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      const parsed = JSON.parse(raw) as PrevState;
      if (parsed && typeof parsed === 'object') {
        this.state = parsed;
      } else {
        this.state = {};
      }
    } catch {
      this.state = {};
    }
  }

  get(day: string): string | undefined {
    return this.state[day];
  }

  async set(day: string, hash: string): Promise<void> {
    this.state[day] = hash;
    await this.save();
  }

  private async save(): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, `${JSON.stringify(this.state, null, 2)}\n`, 'utf8');
  }
}
