import { useEffect, useRef } from 'react';

export default function SSEConsole({ logs }: { logs: string[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollTo(0, ref.current.scrollHeight);
  }, [logs]);

  return (
    <div
      ref={ref}
      style={{
        background: '#0b1220',
        color: '#cbd5e1',
        height: 160,
        overflow: 'auto',
        padding: 8,
        fontFamily: 'ui-monospace,Menlo,monospace',
        fontSize: 12
      }}
    >
      {logs.map((line, idx) => (
        <div key={idx}>{line}</div>
      ))}
    </div>
  );
}
