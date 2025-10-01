import { useStreamingHeartbeat, type StreamingStatus } from '../hooks/useStreamingHeartbeat.js';

const STATUS_META: Record<StreamingStatus, { label: string; bg: string; fg: string; description: string }> = {
  connecting: {
    label: 'Connecting',
    bg: '#fef3c7',
    fg: '#92400e',
    description: 'Waiting for the first heartbeat from the BFF.'
  },
  ok: {
    label: 'OK',
    bg: '#dcfce7',
    fg: '#166534',
    description: 'Receiving heartbeats from the BFF in the last few seconds.'
  },
  stale: {
    label: 'Stale',
    bg: '#fef9c3',
    fg: '#854d0e',
    description: 'No heartbeats detected recently; stream may be paused.'
  },
  error: {
    label: 'Error',
    bg: '#fee2e2',
    fg: '#b91c1c',
    description: 'Stream failed; check the BFF logs or network connectivity.'
  }
};

export default function StreamingBadge() {
  const status = useStreamingHeartbeat();
  const meta = STATUS_META[status];

  return (
    <span
      title={`Streaming status: ${meta.label}. ${meta.description}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        fontWeight: 500,
        padding: '4px 8px',
        borderRadius: 9999,
        backgroundColor: meta.bg,
        color: meta.fg,
        border: `1px solid ${meta.fg}20`
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: '100%',
          backgroundColor: meta.fg,
          boxShadow: status === 'ok' ? `0 0 4px ${meta.fg}` : undefined,
          transition: 'box-shadow 0.2s ease-in-out'
        }}
      />
      <span>Streaming: {meta.label}</span>
    </span>
  );
}
