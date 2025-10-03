import React from 'react';
import { useRiskGate } from '../hooks/useRiskGate';

export default function RiskGateCard() {
  const { latest, gate, verify, loading, error, refresh, runGate, runVerify } = useRiskGate();

  const passed = gate?.gate?.passed ?? null;
  const violations = gate?.gate?.violations ?? [];
  const meta = gate?.reportSummary;

  async function exportReceipts() {
    const params = new URLSearchParams();
    const r = await fetch(`/v1/risk/receipts/export?${params.toString()}`, { method: 'GET' });
    if (!r.ok) throw new Error(`Export failed: ${r.status}`);
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `risk-receipts-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="panel-like">
      <div className="panel-like__header">
        <h3>Risk Gate</h3>
        <div className="panel-like__actions">
          <button type="button" onClick={refresh} title="Refresh latest report">
            Refresh
          </button>
          <button type="button" onClick={runGate} disabled={loading} title="Run policy gate">
            {loading ? 'Running…' : 'Run Gate'}
          </button>
          <button type="button" onClick={() => runVerify()} title="Verify latest event">
            Verify Latest
          </button>
          <button type="button" onClick={exportReceipts} title="Export receipts bundle">
            Export Receipts
          </button>
        </div>
      </div>

      {error ? (
        <div className="callout" role="alert">
          Error: {error}
        </div>
      ) : null}

      {!latest && !error ? <div className="text-muted">No latest report found.</div> : null}

      {latest && !gate ? (
        <div className="text-muted">
          Latest report detected — scope <code>{latest.report?.scope ?? '?'}</code>, risks:{' '}
          <code>{latest.report?.risks?.length ?? 0}</code>. Click <em>Run Gate</em>.
        </div>
      ) : null}

      {gate ? (
        <div className="gate-result">
          <div className="gate-result__status">
            <span className={passed ? 'badge badge--ok' : 'badge badge--alert'}>
              {passed ? 'Passed' : 'Failed'}
            </span>
            <span className="meta">
              {meta?.scope ? `scope=${meta.scope}` : ''}
              {meta?.generated_at ? ` • ${new Date(meta.generated_at).toLocaleString()}` : ''}
              {typeof meta?.total === 'number' ? ` • risks=${meta.total}` : ''}
            </span>
          </div>

          {!passed && violations.length > 0 ? (
            <div className="violations">
              <div className="violations__title">Violations</div>
              <ul>
                {violations.map((v, i) => (
                  <li key={`${v.id}-${i}`}>
                    <span className="code-chip">{v.id}</span>
                    <span className="title">{v.title}</span>
                    <span className="reason"> — {v.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {passed ? (
            <div className="text-muted">No high-severity gaps. All risks ≥12 have next_action.</div>
          ) : null}
        </div>
      ) : null}

      {verify ? (
        <div className="mt-3 text-sm">
          <div className="font-medium mb-1">Verification</div>
          <div className="grid gap-1">
            <div>
              Event: <code>{verify.keyword}</code>{' '}
              {verify.ts ? `• ${new Date(verify.ts).toLocaleString()}` : ''}
            </div>
            <div>
              Algorithm: <code>{verify.recompute.algorithm}</code>
            </div>
            {verify.stored_hash ? (
              <div>
                Stored hash: <code className="break-all">{verify.stored_hash}</code>
              </div>
            ) : null}
            <div>
              Recomputed event hash:{' '}
              <code className="break-all">{verify.recompute.event_obj_hash}</code>
            </div>
            {verify.recompute.artifact_hash ? (
              <div>
                Recomputed artifact hash:{' '}
                <code className="break-all">{verify.recompute.artifact_hash}</code>
              </div>
            ) : null}
            {verify.matches_stored !== null ? (
              <div>
                Match:{' '}
                <span className={verify.matches_stored ? 'badge badge--ok' : 'badge badge--alert'}>
                  {verify.matches_stored ? 'OK' : 'MISMATCH'}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
