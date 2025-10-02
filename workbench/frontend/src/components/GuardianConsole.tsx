import { useState } from 'react';

import { useGuardianMode } from '../hooks/useGuardianMode.js';

const BASE =
  (import.meta as { env?: Record<string, unknown> }).env?.VITE_API_BASE ?? 'http://localhost:8787';

export default function GuardianConsole() {
  const { mode, loading, refresh } = useGuardianMode(15000);
  const [input, setInput] = useState('List latest ledger events; flag non-ok.');
  const [out, setOut] = useState<{ text: string; events: unknown[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    setBusy(true);
    try {
      const r = await fetch(`${BASE}/guardian/ask`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      setOut(await r.json());
      // force a status refresh after successful call (agent might have flipped)
      refresh();
    } catch (err) {
      setOut({ text: `Request failed: ${String(err)}`, events: [] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack guardian-console">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <strong>Status:</strong>
        <span
          className={`badge ${mode === 'agent' ? 'badge--ok' : mode === 'stub' ? 'badge--pending' : 'badge--error'}`}
        >
          {loading ? 'checking…' : mode}
        </span>
      </div>
      <h3>Guardian Console</h3>
      <textarea
        className="monospace"
        rows={4}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <div className="template-runner__actions">
        <button onClick={ask} disabled={busy}>
          {busy ? 'Asking…' : 'Ask Guardian'}
        </button>
        <button onClick={refresh} disabled={busy || loading}>
          Refresh Status
        </button>
      </div>
      {out && (
        <pre className="template-runner__result monospace">{JSON.stringify(out, null, 2)}</pre>
      )}
    </div>
  );
}
