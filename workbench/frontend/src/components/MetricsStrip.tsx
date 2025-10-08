import { useEffect, useState } from 'react';

type MetricsResponse = {
  ok: boolean;
  ts: string;
  day: string;
  eventsToday: number;
  lastRoot: string | null;
};

export default function MetricsStrip() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function fetchMetrics() {
      try {
        const response = await fetch('/metrics/forge');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = (await response.json()) as MetricsResponse;
        setMetrics(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        timer = setTimeout(fetchMetrics, 5_000);
      }
    }

    void fetchMetrics();
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '8px 12px',
        border: '1px solid var(--border)',
        borderRadius: 8,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <strong>Forge Metrics</strong>
      {metrics ? (
        <>
          <span>Day: {metrics.day}</span>
          <span>Events Today: {metrics.eventsToday}</span>
          <span>
            Root:{' '}
            <code style={{ fontSize: 12 }}>
              {metrics.lastRoot ? `${metrics.lastRoot.slice(0, 10)}…` : 'none'}
            </code>
          </span>
          <span style={{ opacity: 0.6 }}>@ {new Date(metrics.ts).toLocaleTimeString()}</span>
        </>
      ) : (
        <span>Loading…</span>
      )}
      {error ? <span style={{ color: 'crimson' }}>{error}</span> : null}
    </div>
  );
}
