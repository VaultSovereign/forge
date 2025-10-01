import * as mock from './mock.js';
import { LedgerEvent, RunResult, TemplateInputs } from './types.js';

const mode = process.env.AI_CORE_MODE || 'mock';

export async function runTemplate(id: string, inputs: TemplateInputs): Promise<RunResult> {
  if (mode === 'mock') {
    return mock.runTemplate(id, inputs);
  }

  throw new Error('live mode not yet implemented');
}

export async function queryLedger(): Promise<LedgerEvent[]> {
  if (mode === 'mock') {
    return mock.queryLedger();
  }

  throw new Error('live mode not yet implemented');
}
