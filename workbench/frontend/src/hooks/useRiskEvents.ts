import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type RiskListItem = {
  ts: string | null;
  keyword: string | null;
  stored_hash: string | null;
  algorithm: string | null;
  event: unknown;
  raw_line: string;
};

export type RiskListPage = {
  items: RiskListItem[];
  count: number;
  next_cursor?: string;
  prev_cursor?: string;
  window?: { from_ts: string | null; to_ts: string | null };
};

function apiBase() {
  const raw = (import.meta as { env?: Record<string, unknown> }).env?.VITE_API_BASE as
    | string
    | undefined;
  if (!raw) return '';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

type Keyword = 'all' | 'register' | 'gate';
type State = { limit: number; keyword: Keyword; since: string; before: string; cursor: string };
type ListOpts = Partial<{
  limit: number;
  keyword: Keyword;
  since_ts: string;
  before_ts: string;
  cursor: string;
}>;

export function useRiskEvents() {
  const BASE = apiBase();
  const [page, setPage] = useState<RiskListPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState<string | null>(null);
  const stateRef = useRef<State>({ limit: 50, keyword: 'all', since: '', before: '', cursor: '' });

  const fetchPage = useCallback(
    async (opts?: ListOpts): Promise<void> => {
      setLoading(true);
      setErr(null);
      try {
        if (opts) {
          stateRef.current = {
            ...stateRef.current,
            ...(opts.limit !== undefined ? { limit: opts.limit } : {}),
            ...(opts.keyword ? { keyword: opts.keyword } : {}),
            ...(opts.since_ts !== undefined ? { since: opts.since_ts } : {}),
            ...(opts.before_ts !== undefined ? { before: opts.before_ts } : {}),
            ...(opts.cursor ? { cursor: opts.cursor } : {}),
          };
        }
        const p = new URLSearchParams();
        const s = stateRef.current;
        p.set('limit', String(s.limit));
        if (s.keyword !== 'all') p.set('keyword', s.keyword);
        if (s.since) p.set('since_ts', s.since);
        if (s.before) p.set('before_ts', s.before);
        if (s.cursor) p.set('cursor', s.cursor);
        const r = await fetch(`${BASE}/v1/risk/list?${p.toString()}`, {
          headers: { 'cache-control': 'no-cache' },
        });
        if (!r.ok && r.status !== 304) throw new Error(`List failed: ${r.status}`);
        if (r.status === 304) return;
        setPage((await r.json()) as RiskListPage);
      } catch (e: unknown) {
        const err = e as { message?: string };
        setErr(err?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    },
    [BASE]
  );

  useEffect(() => {
    void fetchPage({});
  }, [fetchPage]);

  const next = useCallback(async (): Promise<void> => {
    if (page?.next_cursor) await fetchPage({ cursor: page.next_cursor });
  }, [page, fetchPage]);
  const prev = useCallback(async (): Promise<void> => {
    if (page?.prev_cursor) await fetchPage({ cursor: page.prev_cursor });
  }, [page, fetchPage]);

  const controls = useMemo(
    () => ({
      setLimit: (n: number) => fetchPage({ limit: n }),
      setKeyword: (k: Keyword) => fetchPage({ keyword: k }),
      setSince: (iso: string) => fetchPage({ since_ts: iso }),
      setBefore: (iso: string) => fetchPage({ before_ts: iso }),
    }),
    [fetchPage]
  );

  return { page, loading, error: error ?? null, fetchPage, next, prev, ...controls };
}
