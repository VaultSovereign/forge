export type TemplateMeta = {
  id: string;
  name: string;
  description?: string;
  inputs?: unknown;
};

export type ExecuteRequest = {
  templateId: string;
  profile?: string;
  args?: Record<string, unknown>;
};

export type ExecuteResponse = {
  eventId: string;
  status: 'ok' | 'error';
  output?: unknown;
  error?: string;
};

export type LedgerEvent = {
  id: string;
  ts: string;
  template: string;
  profile: string;
  input: unknown;
  output: unknown;
  hash?: string;
  sig?: string;
  status?: 'ok' | 'error';
  error?: string;
};
