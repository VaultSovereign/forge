const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8787';

export type TemplateSummary = {
  id: string;
  name?: string;
  description?: string;
};

export type TemplateExecution = {
  templateId: string;
  profile?: string;
  args?: unknown;
};

export type LedgerRow = {
  id: string;
  template: string;
  profile?: string;
  ts: string | number;
  status?: string;
};

export type LedgerQueryResponse = {
  rows: LedgerRow[];
};

export async function listTemplates(): Promise<TemplateSummary[]> {
  const response = await fetch(`${API_BASE}/v1/api/templates`);
  if (!response.ok) throw new Error(`templates: ${response.status}`);
  return (await response.json()) as TemplateSummary[];
}

export async function executeOnce(body: TemplateExecution) {
  const response = await fetch(`${API_BASE}/v1/api/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`execute: ${response.status}`);
  return response.json();
}

export function streamExecute(
  query: TemplateExecution,
  onLog: (line: string) => void,
  onDone: (result: unknown) => void,
  onError: (error: unknown) => void
) {
  const params = new URLSearchParams({
    templateId: query.templateId,
    profile: query.profile ?? 'vault',
    args: JSON.stringify(query.args ?? {})
  });

  const source = new EventSource(`${API_BASE}/v1/api/execute/stream?${params.toString()}`);
  source.addEventListener('log', (event: MessageEvent) => {
    const payload = JSON.parse(event.data);
    onLog(payload.line);
  });
  source.addEventListener('done', (event: MessageEvent) => {
    const payload = JSON.parse(event.data);
    onDone(payload);
    source.close();
  });
  source.addEventListener('error', (event: MessageEvent) => {
    onError(event);
    source.close();
  });

  return () => source.close();
}

export async function listLedger(limit = 25): Promise<LedgerQueryResponse> {
  const response = await fetch(`${API_BASE}/v1/api/ledger/events?limit=${limit}`);
  if (!response.ok) throw new Error(`ledger: ${response.status}`);
  return (await response.json()) as LedgerQueryResponse;
}
