import { useEffect, useState, useCallback, useRef } from 'react';

function apiBase() {
  const raw = (import.meta as any).env?.VITE_API_BASE as string | undefined;
  if (!raw) return '';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

export type GuardianMode = 'unknown' | 'stub' | 'agent';

export function useGuardianMode(pollMs = 0) {
  const [mode, setMode] = useState<GuardianMode>('unknown');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);
  const BASE = apiBase();

  const probe = useCallback(async () => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setError(null);
    try {
      // Prefer lightweight GET probe; fallback to POST if not available
      const r = await fetch(`${BASE}/v1/guardian/mode`, { signal: ctrl.signal });
      if (r.ok) {
        const data = await r.json().catch(() => ({} as any));
        const m: GuardianMode = data?.mode === 'agent' ? 'agent' : data?.mode === 'stub' ? 'stub' : 'unknown';
        setMode(m);
      } else {
        const r2 = await fetch(`${BASE}/guardian/ask`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ input: 'ping' }),
          signal: ctrl.signal
        });
        const data2 = await r2.json().catch(() => ({} as any));
        const m2: GuardianMode = data2?.mode === 'agent' ? 'agent' : data2?.mode === 'stub' ? 'stub' : 'unknown';
        setMode(m2);
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setError(e?.message ?? 'network error');
        setMode('unknown');
      }
    } finally {
      setLoading(false);
    }
  }, [BASE]);

  useEffect(() => {
    probe();
    if (pollMs > 0) {
      const t = setInterval(probe, pollMs);
      return () => clearInterval(t);
    }
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs]);

  useEffect(() => () => ctrlRef.current?.abort(), []);

  return { mode, loading, error, refresh: probe };
}
