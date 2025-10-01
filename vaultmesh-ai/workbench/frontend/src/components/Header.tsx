import StreamingBadge from './StreamingBadge.js';

export default function Header() {
  return (
    <header
      style={{
        padding: '10px 14px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap'
      }}
    >
      <strong>VaultMesh Workbench</strong>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <nav style={{ display: 'flex', gap: 12 }}>
          <a href="#templates">Templates</a>
          <a href="#run">Run</a>
          <a href="#ledger">Ledger</a>
        </nav>
        <StreamingBadge />
      </div>
    </header>
  );
}
