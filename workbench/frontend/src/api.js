const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8787';
export async function listTemplates() {
    const response = await fetch(`${API_BASE}/v1/api/templates`);
    if (!response.ok)
        throw new Error(`templates: ${response.status}`);
    return (await response.json());
}
export async function executeOnce(body) {
    const response = await fetch(`${API_BASE}/v1/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!response.ok)
        throw new Error(`execute: ${response.status}`);
    return response.json();
}
export function streamExecute(query, onLog, onDone, onError) {
    const params = new URLSearchParams({
        templateId: query.templateId,
        profile: query.profile ?? 'vault',
        args: JSON.stringify(query.args ?? {})
    });
    const source = new EventSource(`${API_BASE}/v1/api/execute/stream?${params.toString()}`);
    source.addEventListener('log', (event) => {
        const payload = JSON.parse(event.data);
        onLog(payload.line);
    });
    source.addEventListener('done', (event) => {
        const payload = JSON.parse(event.data);
        onDone(payload);
        source.close();
    });
    source.addEventListener('error', (event) => {
        onError(event);
        source.close();
    });
    return () => source.close();
}
export async function listLedger(limit = 25) {
    const response = await fetch(`${API_BASE}/v1/api/ledger/events?limit=${limit}`);
    if (!response.ok)
        throw new Error(`ledger: ${response.status}`);
    return (await response.json());
}
