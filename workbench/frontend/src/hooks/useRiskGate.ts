import { useEffect, useState, useCallback, useRef } from 'react';

// Types for verify payload/response (keep local to avoid circular imports)
type VerifyKind = 'register' | 'gate';
type Violation = { id: string; title: string; reason: string };
type GateResult = { passed: boolean; violations: Violation[] };
type LatestResp = { report: unknown };
type GateResp = {
  gate: GateResult;
  reportSummary: { scope: string; generated_at: string; total: number };
};
type VerifyResp = {
  keyword: string | null;
  ts: string | null;
  stored_hash: string | null;
  recompute: {
    event_obj_hash: string;
    artifact_hash: string | null;
    algorithm: 'blake3' | 'sha256';
  };
  matches_stored: boolean | null;
};

function apiBase() {
  const raw = (import.meta as { env?: Record<string, unknown> }).env?.VITE_API_BASE as
    | string
    | undefined;
  if (!raw) return '';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

export function useRiskGate() {
  const BASE = apiBase();
  const [latest, setLatest] = useState<LatestResp | null>(null);
  const [gate, setGate] = useState<GateResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState<string | null>(null);
  const [verify, setVerify] = useState<VerifyResp | null>(null);
  const [riskList, setRiskList] = useState<{ count: number; events: unknown[] } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchLatest = useCallback(async (): Promise<void> => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setErr(null);
    try {
      const r = await fetch(`${BASE}/v1/risk/latest`, { signal: ctrl.signal });
      if (!r.ok) throw new Error(`Latest fetch failed: ${r.status}`);
      const j = (await r.json()) as LatestResp;
      setLatest(j);
    } catch (e: unknown) {
      const err = e as { name?: string; message?: string };
      if (err?.name !== 'AbortError') setErr(err?.message ?? String(e));
    }
  }, [BASE]);

  const runGate = useCallback(async (): Promise<void> => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`${BASE}/v1/risk/policy-gate`, { method: 'POST' });
      if (!r.ok) throw new Error(`Gate run failed: ${r.status}`);
      setGate(
        (await r.json()) as {
          gate: { passed: boolean; violations: Violation[] };
          reportSummary: { scope: string; generated_at: string; total: number };
        }
      );
    } catch (e: unknown) {
      const err = e as { message?: string };
      setErr(err?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [BASE]);

  const runVerify = useCallback(
    async (kind?: VerifyKind): Promise<void> => {
      setErr(null);
      try {
        const r = await fetch(`${BASE}/v1/risk/verify`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(kind ? { kind } : {}),
        });
        if (!r.ok) throw new Error(`Verify failed: ${r.status}`);
        setVerify((await r.json()) as VerifyResp);
      } catch (e: unknown) {
        const err = e as { message?: string };
        setErr(err?.message ?? String(e));
      }
    },
    [BASE]
  );

  const verifyEvent = useCallback(
    async (payload: {
      event?: unknown;
      line?: string;
      stored_hash?: string;
    }): Promise<VerifyResp> => {
      setErr(null);
      try {
        const r = await fetch(`${BASE}/v1/risk/verify`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error(`Verify failed: ${r.status}`);
        const data = (await r.json()) as VerifyResp;
        setVerify(data);
        return data;
      } catch (e: unknown) {
        const err = e as { message?: string };
        setErr(err?.message ?? String(e));
        throw e;
      }
    },
    [BASE]
  );

  useEffect(() => {
    fetchLatest();
    return () => abortRef.current?.abort();
  }, [fetchLatest]);

  const fetchRiskList = useCallback(
    async (limit?: number): Promise<void> => {
      const q = limit ? `?limit=${limit}` : '';
      const r = await fetch(`${BASE}/v1/risk/list${q}`);
      if (!r.ok) throw new Error(`List failed: ${r.status}`);
      setRiskList((await r.json()) as { count: number; events: unknown[] });
    },
    [BASE]
  );

  return {
    latest,
    gate,
    verify,
    riskList,
    fetchRiskList,
    loading,
    error,
    refresh: fetchLatest,
    runGate,
    runVerify,
    verifyEvent,
  };
}
