import { LedgerEvent, RunResult, TemplateInputs } from './types.js';

export async function runTemplate(id: string, inputs: TemplateInputs): Promise<RunResult> {
  return { id: `mock-${id}`, status: 'ok', output: { echo: inputs } };
}

export async function queryLedger(): Promise<LedgerEvent[]> {
  return [
    { id: 'evt1', ts: Date.now(), actor: 'mock', status: 'completed', simulated: true }
  ];
}
