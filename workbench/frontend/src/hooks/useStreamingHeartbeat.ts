import { useEffect, useRef, useState } from 'react';

export type StreamingStatus = 'connecting' | 'ok' | 'stale' | 'error';

export function useStreamingHeartbeat(path = '/v1/tick/stream', staleMs = 3000) {
  const [status, setStatus] = useState<StreamingStatus>('connecting');
  const lastTickRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const source = new EventSource(path);

    const markOk = () => {
      lastTickRef.current = Date.now();
      if (!cancelled) {
        setStatus('ok');
      }
    };

    source.addEventListener('open', () => {
      if (!cancelled && lastTickRef.current === null) {
        setStatus('connecting');
      }
    });

    source.addEventListener('hello', markOk);
    source.addEventListener('tick', markOk);

    source.addEventListener('error', () => {
      if (!cancelled) {
        setStatus('error');
      }
    });

    const interval = window.setInterval(() => {
      const lastTick = lastTickRef.current;
      if (cancelled || lastTick === null) {
        return;
      }

      const age = Date.now() - lastTick;
      if (age > staleMs && !cancelled) {
        setStatus((prev) => (prev === 'error' ? prev : 'stale'));
      }
    }, Math.max(500, Math.floor(staleMs / 2)));

    return () => {
      cancelled = true;
      source.close();
      window.clearInterval(interval);
    };
  }, [path, staleMs]);

  return status;
}
