import { useMemo, useState } from 'react';

import { useSse, type SseMessage } from '../hooks/useSse.js';

export default function ForgeRunPanel() {
  const [keyword, setKeyword] = useState('guardrails-check');
  const [argsText, setArgsText] = useState(
    '{"templateYaml":"id:x\\nversion:1.0.0\\nkeyword:test\\ninputs:[]\\nprompts:{system:\"ok\",user:\"hi\"}"}'
  );
  const [model, setModel] = useState('');
  const [traceId, setTraceId] = useState<string | null>(null);
  const [entries, setEntries] = useState<SseMessage[]>([]);

  const url = useMemo(() => {
    if (!traceId) {
      return null;
    }
    const base = new URL('/v3/run/stream', window.location.origin);
    base.searchParams.set('keyword', keyword);
    base.searchParams.set('traceId', traceId);
    if (model.trim()) {
      base.searchParams.set('model', model.trim());
    }
    if (argsText.trim()) {
      base.searchParams.set('args', argsText.trim());
    }
    return base.toString();
  }, [traceId, keyword, model, argsText]);

  const { status } = useSse(url, (message) => {
    setEntries((prev) => [...prev, message]);
  });

  const handleRun = () => {
    setEntries([]);
    setTraceId(crypto.randomUUID());
  };

  const handleReset = () => {
    setEntries([]);
    setTraceId(null);
  };

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label className="stack" style={{ gap: 4 }}>
          <span>Keyword</span>
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="guardrails-check" />
        </label>
        <label className="stack" style={{ gap: 4 }}>
          <span>Model (optional)</span>
          <input value={model} onChange={(event) => setModel(event.target.value)} placeholder="gpt-4o-mini" />
        </label>
      </div>
      <label className="stack" style={{ gap: 4 }}>
        <span>Args (JSON)</span>
        <textarea
          value={argsText}
          onChange={(event) => setArgsText(event.target.value)}
          rows={6}
          className="monospace"
        />
      </label>
      <div className="panel__actions" style={{ gap: 8 }}>
        <button type="button" onClick={handleRun}>
          Run &amp; Bind
        </button>
        <button type="button" onClick={handleReset}>
          Reset
        </button>
        <span>
          Stream: <strong>{status}</strong>
        </span>
      </div>
      <ol className="stack" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', gap: 6 }}>
        {entries.map((entry, index) => (
          <li key={`${entry.event}-${index}`}>
            <code>{entry.event}</code>
            <span> — </span>
            <span>{formatData(entry.data)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function formatData(data: unknown): string {
  if (typeof data === 'string') {
    return data;
  }
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}
