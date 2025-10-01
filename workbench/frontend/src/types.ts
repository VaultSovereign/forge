export type TemplateMeta = {
  id: string;
  name: string;
  description?: string;
  inputs?: unknown;
};

export type ExecuteResponse = {
  eventId: string;
  status: 'ok' | 'error';
  output?: unknown;
  error?: string;
};

export type LedgerRow = {
  id: string;
  ts: string;
  template: string;
  profile: string;
  status?: string;
};
