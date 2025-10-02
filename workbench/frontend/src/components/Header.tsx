import StreamingBadge from './StreamingBadge';

export default function Header() {
  const showApiLink = import.meta.env.DEV || import.meta.env.VITE_EXPOSE_OPENAPI === '1';
  const showDocsLink = import.meta.env.VITE_EXPOSE_DOCS === '1';
  return (
    <header
      style={{
        padding: '10px 14px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <strong>VaultMesh Workbench</strong>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <nav style={{ display: 'flex', gap: 12 }}>
          <a href="#templates">Templates</a>
          <a href="#run">Run</a>
          <a href="#ledger">Ledger</a>
          {showApiLink ? (
            <a href="/v1/openapi.json" target="_blank" rel="noopener noreferrer">
              API
            </a>
          ) : null}
          {showDocsLink ? (
            <a href="/docs/OPENAPI.md" target="_blank" rel="noopener noreferrer">
              Docs
            </a>
          ) : null}
        </nav>
        <StreamingBadge />
      </div>
    </header>
  );
}
