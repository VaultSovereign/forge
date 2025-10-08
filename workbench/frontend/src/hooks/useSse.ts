import { useEffect, useRef, useState } from 'react';

export interface SseMessage<T = unknown> {
  event: string;
  data: T;
}

export function useSse<T = unknown>(url: string | null, onEvent?: (msg: SseMessage<T>) => void) {
  const [messages, setMessages] = useState<SseMessage<T>[]>([]);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'open' | 'closed'>('idle');
  const esRef = useRef<EventSource | null>(null);
  const backoffRef = useRef(1000);

  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    const connect = () => {
      if (cancelled) return;
      setStatus('connecting');
      const es = new EventSource(url, { withCredentials: false });
      esRef.current = es;

      es.onopen = () => {
        setStatus('open');
        backoffRef.current = 1000;
      };
      es.onerror = () => {
        setStatus('closed');
        es.close();
        if (cancelled) return;
        const t = backoffRef.current;
        backoffRef.current = Math.min(t * 2, 15000);
        setTimeout(connect, t + Math.floor(Math.random() * 500));
      };

      const handler = (ev: MessageEvent) => {
        const msg: SseMessage<T> = { event: (ev as any).type || 'message', data: parse(ev.data) };
        setMessages((prev) => [...prev, msg]);
        onEvent?.(msg);
      };

      es.addEventListener('message', handler as any);
      es.addEventListener('progress', handler as any);
      es.addEventListener('done', handler as any);
    };

    connect();

    return () => {
      cancelled = true;
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [url]);

  return { messages, status };
}

function parse<T>(s: string): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return s as unknown as T;
  }
}
