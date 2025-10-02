import { useMemo } from 'react';
import TemplateRunner from './components/TemplateRunner';
import LedgerTable from './components/LedgerTable';
import StreamingBadge from './components/StreamingBadge';
import Panel from './components/dashboard/Panel.js';
import OverviewStrip, { type OverviewItem } from './components/dashboard/OverviewStrip.js';
import QuickLinks from './components/dashboard/QuickLinks.js';
import { useDashboardSnapshot } from './hooks/useDashboardSnapshot.js';
import type { LedgerRow } from './api';
import GuardianConsole from './components/GuardianConsole.js';
import { useGuardianMode } from './hooks/useGuardianMode.js';
import { useTemplateCount } from './hooks/useTemplateCount.js';

export default function App() {
  const snapshot = useDashboardSnapshot(20);
  const { mode: guardianMode, loading: guardianLoading } = useGuardianMode(0);
  const { count: templateCountLive, loading: templateCountLoading } = useTemplateCount();

  const templateCount =
    (typeof templateCountLive === 'number' ? templateCountLive : undefined) ??
    (Array.isArray(snapshot?.templates) ? snapshot.templates.length : undefined) ??
    0;

  const derived = useMemo<{
    profileCount: number;
    errorCount: number;
    latest: LedgerRow | null;
  }>(() => {
    const profiles = new Set<string>();
    let errorCount = 0;
    let latest: LedgerRow | null = null;

    snapshot.ledger.forEach((row) => {
      if (row.profile) {
        profiles.add(row.profile);
      }
      if (row.status && row.status !== 'ok') {
        errorCount += 1;
      }
      const rowTs = new Date(row.ts).getTime();
      const latestTs = latest ? new Date(latest.ts).getTime() : 0;
      if (!latest || rowTs > latestTs) {
        latest = row;
      }
    });

    return {
      profileCount: profiles.size,
      errorCount,
      latest,
    };
  }, [snapshot.ledger]);

  const { latest, profileCount, errorCount } = derived;

  const overviewItems = useMemo<OverviewItem[]>(() => {
    if (snapshot.loading && snapshot.templates.length === 0 && snapshot.ledger.length === 0) {
      return [
        { label: 'Templates', value: '—', hint: 'Loading templates' },
        { label: 'Active Profiles', value: '—', hint: 'Awaiting ledger activity' },
        { label: 'Last Event', value: 'Loading…', hint: 'Streaming heartbeat pending' },
        { label: 'Alerts', value: '—', hint: 'Initializing dashboard' },
      ];
    }

    const items: OverviewItem[] = [
      {
        label: 'Templates',
        value: templateCount.toString(),
        hint: `${templateCount} template${templateCount === 1 ? '' : 's'} ${templateCount === 0 ? 'available' : 'ready'}`,
      },
      {
        label: 'Active Profiles',
        value: profileCount.toString(),
        hint:
          profileCount > 0 ? 'Profiles seen in recent ledger activity' : 'No ledger traffic yet',
      },
      {
        label: 'Last Event',
        value: latest
          ? new Date(latest.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'None yet',
        hint: latest
          ? `${latest.template} → ${latest.profile ?? 'default profile'}`
          : 'Awaiting first execution',
        tone:
          latest && latest.status && latest.status !== 'ok' ? 'alert' : latest ? 'ok' : 'neutral',
      },
      {
        label: 'Alerts',
        value: errorCount > 0 ? String(errorCount) : '0',
        hint:
          errorCount > 0
            ? 'Review ledger entries flagged as non-ok'
            : 'All recent executions nominal',
        tone: errorCount > 0 ? 'alert' : 'ok',
      },
    ];

    items.push({
      label: 'Guardian',
      value: guardianLoading ? '…' : guardianMode,
      hint:
        guardianMode === 'agent'
          ? 'Agent active (tools available)'
          : guardianMode === 'stub'
            ? 'Stub mode (echo only)'
            : 'Status unavailable',
      tone: guardianMode === 'agent' ? 'ok' : guardianMode === 'stub' ? 'neutral' : 'alert',
    });
    return items;
  }, [
    snapshot.loading,
    snapshot.templates.length,
    snapshot.ledger.length,
    latest,
    profileCount,
    errorCount,
    guardianMode,
    guardianLoading,
    templateCount,
  ]);

  const lastUpdated = useMemo(() => {
    if (snapshot.loading) {
      return 'Refreshing data…';
    }
    if (!latest) {
      return 'No ledger entries yet';
    }
    return `Last activity ${new Date(latest.ts).toLocaleString()}`;
  }, [snapshot.loading, latest]);

  const quickLinks = useMemo(
    () => [
      {
        label: 'Workbench README',
        description: 'Follow the setup notes for running the frontend + BFF locally or in Replit.',
        href: 'https://github.com/VaultSovereign/forge/blob/main/workbench/README-WORKBENCH.md',
      },
      {
        label: 'Reality Ledger (API)',
        description: 'Inspect the raw JSON feed backing this dashboard to debug issues quickly.',
        href: 'http://localhost:8787/v1/api/ledger/events?limit=25',
      },
      {
        label: 'Template Catalog',
        description:
          'Browse the source templates shipped with VaultMesh to design new automations.',
        href: 'https://github.com/VaultSovereign/forge/tree/main/catalog',
      },
    ],
    [],
  );

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar__logo">
          <span>VaultMesh</span>
          <strong>Operations Portal</strong>
        </div>
        <nav>
          <a href="#overview">Overview</a>
          <a href="#run">Template Runner</a>
          <a href="#ledger">Reality Ledger</a>
          <a href="#resources">Resources</a>
        </nav>
        <div className="app-sidebar__footer">{lastUpdated}</div>
      </aside>

      <main className="app-main">
        <header className="topbar" id="overview">
          <div className="topbar__title">
            <h1>VaultMesh Command Center</h1>
            <p>Monitor templates, execute flows, and trace ledger events without leaving Replit.</p>
          </div>
          <div className="topbar__actions">
            <StreamingBadge />
            <button
              type="button"
              onClick={() => void snapshot.refresh()}
              disabled={snapshot.loading}
            >
              {snapshot.loading ? 'Refreshing…' : 'Refresh Data'}
            </button>
          </div>
        </header>

        <OverviewStrip items={overviewItems} />

        {snapshot.error ? (
          <div className="callout" role="alert">
            <strong>API request failed</strong>
            <p>{snapshot.error}</p>
            <p>
              Ensure the backend-for-frontend service is running on port 8787 and that CORS is
              permitted.
            </p>
          </div>
        ) : null}

        <div className="panels-grid">
          <Panel
            id="run"
            label="Execution"
            title="Template Runner"
            description="Run templates once via REST or stream outputs using server-sent events."
          >
            <TemplateRunner />
          </Panel>

          <Panel
            id="ledger"
            label="Ledger"
            title="Recent Activity"
            description="The latest ledger events provide traceability for every automated action."
            actions={
              <button
                type="button"
                onClick={() => void snapshot.refresh()}
                disabled={snapshot.loading}
              >
                Sync Ledger
              </button>
            }
          >
            <div className="table-responsive">
              <LedgerTable rows={snapshot.ledger} showHeader={false} />
            </div>
          </Panel>

          <Panel
            id="guardian"
            label="Agent"
            title="Guardian Console"
            description="Ask the VaultMesh Guardian to inspect health, list events, or run templates via tools."
          >
            <GuardianConsole />
          </Panel>

          <Panel
            id="resources"
            label="Enablement"
            title="Build Faster"
            description="Use these shortcuts to keep your Replit workspace in sync with the Forge."
          >
            <QuickLinks items={quickLinks} />
            <div className="callout">
              <strong>Tip</strong>
              <p>
                Expose `VITE_API_BASE` inside Replit to point the frontend at your running BFF.
                Restart the repl after changing env vars.
              </p>
            </div>
          </Panel>
        </div>
      </main>
    </div>
  );
}
