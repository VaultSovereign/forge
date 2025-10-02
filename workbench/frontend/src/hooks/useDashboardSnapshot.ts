import { useCallback, useEffect, useMemo, useState } from 'react';
import { listLedger, listTemplates, type LedgerRow, type TemplateSummary } from '../api';

export type DashboardSnapshot = {
  templates: TemplateSummary[];
  ledger: LedgerRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useDashboardSnapshot(limit = 25): DashboardSnapshot {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [templatePayload, ledgerPayload] = await Promise.all([
        listTemplates(),
        listLedger(limit)
      ]);

      setTemplates(templatePayload);
      setLedger(ledgerPayload.rows ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return useMemo(
    () => ({
      templates,
      ledger,
      loading,
      error,
      refresh
    }),
    [templates, ledger, loading, error, refresh]
  );
}
