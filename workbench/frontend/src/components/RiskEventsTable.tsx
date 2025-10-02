import React, { useEffect, useState } from 'react';
import { useRiskEvents } from '../hooks/useRiskEvents';
import { useRiskGate } from '../hooks/useRiskGate';

export default function RiskEventsTable() {
  const { page, loading, error, fetchPage, next, prev, setLimit, setKeyword, setSince, setBefore } =
    useRiskEvents();
  const { verifyEvent } = useRiskGate();
  const [sinceLocal, setSinceLocal] = useState<string>('');
  const [beforeLocal, setBeforeLocal] = useState<string>('');
  const [cursorInput, setCursorInput] = useState<string>('');
  const [cursorErr, setCursorErr] = useState<string>('');

  useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

  function applyWindow() {
    setSince(sinceLocal || '');
    setBefore(beforeLocal || '');
  }

  function clearWindow() {
    setSinceLocal('');
    setBeforeLocal('');
    setSince('');
    setBefore('');
  }

  function handleLoadCursor() {
    const val = (cursorInput || '').trim();
    if (!val) {
      setCursorErr('Cursor is empty');
      return;
    }
    const ok = /^.+\.jsonl:\d+$/.test(val);
    if (!ok) {
      setCursorErr("Cursor must look like 'events-YYYY-MM-DD.jsonl:42'");
      return;
    }
    setCursorErr('');
    void fetchPage({ cursor: val });
  }

  function _toLocalInputValue(iso?: string | null) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
        d.getMinutes()
      )}`;
    } catch {
      return '';
    }
  }

  const nextCursor = page?.next_cursor ?? '';
  const prevCursor = page?.prev_cursor ?? '';

  async function copy(text: string): Promise<void> {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  return (
    <div className="stack">
      <div className="panel__header">
        <div>
          <h3 className="panel__title">Risk Events</h3>
          <p className="panel__description">
            Recent risk register and policy gate events with stored hashes.
          </p>
        </div>
        <div className="panel__actions" style={{ gap: '8px', flexWrap: 'wrap', display: 'flex' }}>
          <label className="opacity-70">Type</label>
          <select
            onChange={(e) => setKeyword(e.target.value as 'all' | 'register' | 'gate')}
            className="border rounded px-2 py-1"
          >
            <option value="all">All</option>
            <option value="register">Register</option>
            <option value="gate">Gate</option>
          </select>
          <label className="opacity-70">Limit</label>
          <select
            onChange={(e) => setLimit(Number(e.target.value))}
            className="border rounded px-2 py-1"
          >
            <option>25</option>
            <option>50</option>
            <option>100</option>
            <option>200</option>
          </select>
          <button type="button" onClick={() => fetchPage()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" onClick={prev} disabled={!page?.prev_cursor}>
            Prev
          </button>
          <button type="button" onClick={next} disabled={!page?.next_cursor}>
            Next
          </button>
        </div>
      </div>

      <div
        className="panel__actions"
        style={{ gap: '12px', flexWrap: 'wrap', display: 'flex', alignItems: 'end' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label className="opacity-70">Since (inclusive)</label>
          <input
            type="datetime-local"
            className="border rounded px-2 py-1"
            value={sinceLocal}
            onChange={(e) => setSinceLocal(e.target.value)}
            placeholder="YYYY-MM-DDTHH:MM"
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label className="opacity-70">Before (exclusive)</label>
          <input
            type="datetime-local"
            className="border rounded px-2 py-1"
            value={beforeLocal}
            onChange={(e) => setBeforeLocal(e.target.value)}
            placeholder="YYYY-MM-DDTHH:MM"
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', paddingBottom: '2px' }}>
          <button className="px-3 py-1 rounded border" onClick={applyWindow}>
            Apply
          </button>
          <button className="px-3 py-1 rounded border" onClick={clearWindow}>
            Clear
          </button>
          <button
            className="px-3 py-1 rounded border"
            onClick={() => {
              const now = new Date();
              const start = new Date(now);
              start.setHours(0, 0, 0, 0);
              const end = new Date(start);
              end.setDate(start.getDate() + 1);
              const pad = (n: number) => String(n).padStart(2, '0');
              const toLocal = (d: Date) =>
                `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
              setSinceLocal(toLocal(start));
              setBeforeLocal(toLocal(end));
            }}
          >
            Today
          </button>
        </div>
      </div>

      <div
        className="text-xs"
        style={{
          opacity: 0.8,
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: '4px',
        }}
      >
        <span>Cursor:</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
            {prevCursor || '—'}
          </code>
          <button
            className="px-2 py-0.5 border rounded"
            disabled={!prevCursor}
            onClick={() => copy(prevCursor)}
          >
            Copy Prev
          </button>
        </span>
        <span>→</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
            {nextCursor || '—'}
          </code>
          <button
            className="px-2 py-0.5 border rounded"
            disabled={!nextCursor}
            onClick={() => copy(nextCursor)}
          >
            Copy Next
          </button>
        </span>
        {page?.window ? (
          <span style={{ marginLeft: '6px' }}>
            Window: {page.window.from_ts ?? '—'} → {page.window.to_ts ?? '—'}
          </span>
        ) : null}
      </div>

      <div
        className="panel__actions"
        style={{
          gap: '8px',
          flexWrap: 'wrap',
          display: 'flex',
          alignItems: 'end',
          marginBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label className="opacity-70">Load from cursor (shard:pos)</label>
          <input
            className="border rounded px-2 py-1"
            placeholder="e.g. events-2025-10-02.jsonl:42"
            value={cursorInput}
            onChange={(e) => {
              setCursorInput(e.target.value);
              setCursorErr('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleLoadCursor();
              }
            }}
          />
        </div>
        <button className="px-3 py-1 rounded border" onClick={handleLoadCursor}>
          Load
        </button>
        {cursorErr ? <span className="text-red-600 text-xs">{cursorErr}</span> : null}
      </div>

      {error ? (
        <div className="callout" role="alert">
          Error: {String(error)}
        </div>
      ) : null}

      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Keyword</th>
              <th>Stored Hash</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!page || page.items.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '16px', opacity: 0.7 }}>
                  {loading ? 'Loading…' : 'No risk events.'}
                </td>
              </tr>
            ) : (
              page.items.map((r, i) => (
                <tr key={`${r.ts}-${i}`}>
                  <td>{r.ts ? new Date(r.ts).toLocaleString() : '—'}</td>
                  <td>{r.keyword ?? '—'}</td>
                  <td>
                    <code className="monospace break-all">{r.stored_hash ?? '—'}</code>
                  </td>
                  <td>
                    <div className="flex" style={{ gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() =>
                          verifyEvent({
                            line: r.raw_line,
                            stored_hash: r.stored_hash ?? undefined,
                            event: r.event,
                          })
                        }
                        title="Verify this event via raw JSONL"
                      >
                        Verify
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const blob = new Blob([r.raw_line + '\n'], { type: 'application/jsonl' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `risk-event-${r.keyword ?? 'unknown'}-${(r.ts ?? Date.now()).toString().replace(/[:.]/g, '-')}.jsonl`;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Download
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs" style={{ opacity: 0.7, marginTop: '6px' }}>
        Window: {page?.window?.from_ts ?? '—'} → {page?.window?.to_ts ?? '—'}
      </div>
    </div>
  );
}
