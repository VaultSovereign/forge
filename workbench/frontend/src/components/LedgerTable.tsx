import { useCallback, useEffect, useState } from 'react';
import { listLedger, type LedgerRow } from '../api.js';

type LedgerTableProps = {
  rows?: LedgerRow[];
  limit?: number;
  showHeader?: boolean;
};

export default function LedgerTable({ rows: providedRows, limit = 25, showHeader = true }: LedgerTableProps) {
  const [rows, setRows] = useState<LedgerRow[]>(providedRows ?? []);
  const shouldFetch = providedRows === undefined;

  useEffect(() => {
    if (!shouldFetch) return;

    listLedger(limit)
      .then((payload) => setRows(payload.rows ?? []))
      .catch((error) => console.error('ledger failed', error));
  }, [shouldFetch, limit]);

  useEffect(() => {
    if (providedRows === undefined) return;
    setRows(providedRows);
  }, [providedRows]);

  const renderStatus = useCallback((status?: string) => {
    const normalized = status ?? 'ok';
    const tone = normalized === 'ok' ? 'badge badge--ok' : normalized === 'pending' ? 'badge badge--pending' : 'badge badge--error';
    return <span className={tone}>{normalized}</span>;
  }, []);

  return (
    <div className="stack">
      {showHeader ? <h3>Reality Ledger</h3> : null}
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Event ID</th>
              <th>Template</th>
              <th>Profile</th>
              <th>Timestamp</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '18px 14px', textAlign: 'center', color: '#64748b' }}>
                  No ledger events yet. Trigger a template run to see activity.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <code className="monospace">{row.id}</code>
                  </td>
                  <td>{row.template}</td>
                  <td>{row.profile ?? '—'}</td>
                  <td>{new Date(row.ts).toLocaleString()}</td>
                  <td>{renderStatus(row.status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
