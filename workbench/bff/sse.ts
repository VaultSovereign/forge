import type { FastifyReply, FastifyRequest } from 'fastify';
import { getLogger } from '../../lib/logger.js';

export interface Sse {
  send(event: string, data: unknown): void;
  close(): void;
}

export function initSse(req: FastifyRequest, reply: FastifyReply, bindings?: Record<string, unknown>): Sse {
  const log = getLogger({ module: 'bff-sse', ...bindings });

  reply.raw.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
  reply.raw.setHeader('Connection', 'keep-alive');
  reply.raw.flushHeaders?.();

  let closed = false;
  const keepAlive = setInterval(() => {
    if (closed) return;
    reply.raw.write(`:ka ${Date.now()}\n\n`);
  }, 15000);

  req.raw.on('close', () => {
    closed = true;
    clearInterval(keepAlive);
    try {
      reply.raw.end();
    } catch {}
    log.info('SSE client disconnected');
  });

  function write(event: string, data: unknown) {
    if (closed) return;
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    reply.raw.write(`event: ${event}\n`);
    reply.raw.write(`data: ${payload}\n\n`);
  }

  return {
    send: write,
    close: () => {
      if (closed) return;
      closed = true;
      clearInterval(keepAlive);
      try {
        reply.raw.end();
      } catch {}
      log.info('SSE closed by server');
    },
  };
}
