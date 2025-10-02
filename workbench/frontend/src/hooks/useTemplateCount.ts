import { useEffect, useState, useRef } from 'react';

function apiBase() {
  const raw = (import.meta as { env?: Record<string, unknown> }).env?.VITE_API_BASE as
    | string
    | undefined;
  if (!raw) return '';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

export function useTemplateCount(filter?: string) {
  const base = apiBase();
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const qs = filter ? `?filter=${encodeURIComponent(filter)}` : '';
    setLoading(true);
    setErr(null);

    fetch(`${base}/v1/api/templates/count${qs}`, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j: { total?: number }) => setCount(j?.total ?? null))
      .catch((e) => {
        const err = e as { name?: string; message?: string };
        if (err?.name !== 'AbortError') setErr(err?.message ?? 'fetch failed');
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [base, filter]);

  return { count, loading, error: err };
}
