export interface RunResult {
  id: string;
  status: string;
  output: unknown;
}

export interface LedgerEvent {
  id: string;
  ts: number;
  actor: string;
  status: string;
  simulated?: boolean;
}

export type TemplateInputs = Record<string, unknown>;
