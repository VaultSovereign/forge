import { useEffect, useState, useCallback, useRef } from 'react';

type Violation = { id: string; title: string; reason: string };
type GateResult = { passed: boolean; violations: Violation[] };
type LatestResp = { report: any };
type GateResp = {
  gate: GateResult;
  reportSummary: { scope: string; generated_at: string; total: number };
};
type VerifyResp = {
  keyword: string;
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
  const [riskList, setRiskList] = useState<{ count: number; events: any[] } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchLatest = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setErr(null);
    try {
      const r = await fetch(`${BASE}/v1/risk/latest`, { signal: ctrl.signal });
      if (!r.ok) throw new Error(`Latest fetch failed: ${r.status}`);
      setLatest((await r.json()) as LatestResp);
    } catch (e: any) {
      if (e?.name !== 'AbortError') setErr(e.message || String(e));
    }
  }, [BASE]);

  const runGate = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`${BASE}/v1/risk/policy-gate`, { method: 'POST' });
      if (!r.ok) throw new Error(`Gate run failed: ${r.status}`);
      setGate((await r.json()) as GateResp);
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [BASE]);

  const runVerify = useCallback(
    async (kind?: 'register' | 'gate') => {
      setErr(null);
      try {
        const r = await fetch(`${BASE}/v1/risk/verify`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(kind ? { kind } : {}),
        });
        if (!r.ok) throw new Error(`Verify failed: ${r.status}`);
        setVerify((await r.json()) as VerifyResp);
      } catch (e: any) {
        setErr(e.message || String(e));
      }
    },
    [BASE]
  );

  const verifyEvent = useCallback(
    async (
      opts?: Partial<{
        event: unknown;
        line: string;
        stored_hash: string;
      }>
    ) => {
      setErr(null);
      try {
        const payload: Record<string, unknown> = {};
        if (opts?.line) {
          payload.line = opts.line;
          if (opts.stored_hash) payload.stored_hash = opts.stored_hash;
        } else if (opts?.event) {
          payload.event = opts.event;
          if (opts.stored_hash) payload.stored_hash = opts.stored_hash;
        }
        const r = await fetch(`${BASE}/v1/risk/verify`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error(`Verify event failed: ${r.status}`);
        setVerify((await r.json()) as VerifyResp);
      } catch (e: any) {
        setErr(e.message || String(e));
      }
    },
    [BASE]
  );

  useEffect(() => {
    fetchLatest();
    return () => abortRef.current?.abort();
  }, [fetchLatest]);

  const fetchRiskList = useCallback(
    async (limit?: number) => {
      const q = limit ? `?limit=${limit}` : '';
      const r = await fetch(`${BASE}/v1/risk/list${q}`);
      if (!r.ok) throw new Error(`List failed: ${r.status}`);
      setRiskList((await r.json()) as { count: number; events: any[] });
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
