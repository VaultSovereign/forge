import { useMemo } from 'react';

import { useSse } from '../hooks/useSse';

export default function TemplateRunnerV2() {
  const url = useMemo(() => {
    const target = new URL('/sse/execute', window.location.origin);
    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : String(Date.now());
    target.searchParams.set('traceId', id);
    return target.toString();
  }, []);

  const { messages, status } = useSse<Record<string, unknown>>(url);

  return (
    <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
      <h3>Template Runner v2 (SSE)</h3>
      <div>Status: {status}</div>
      <ol>
        {messages.map((message, index) => (
          <li key={index}>
            <code>{message.event}</code>: <pre style={{ display: 'inline' }}>{JSON.stringify(message.data)}</pre>
          </li>
        ))}
      </ol>
    </div>
  );
}
