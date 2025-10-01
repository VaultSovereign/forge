import type { FastifyInstance } from 'fastify';

export default async function tickRoutes(app: FastifyInstance) {
  app.get('/v1/tick/stream', async (request, reply) => {
    reply
      .header('Content-Type', 'text/event-stream; charset=utf-8')
      .header('Cache-Control', 'no-cache, no-transform')
      .header('Connection', 'keep-alive')
      .header('X-Accel-Buffering', 'no')
      .code(200);

    const raw = reply.raw as typeof reply.raw & { flush?: () => void };
    raw.flush?.();

    let alive = true;

    const send = (event: string, data: unknown) => {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      raw.write(payload);
      raw.flush?.();
    };

    send('hello', {
      service: 'workbench-bff',
      mode: process.env.AI_CORE_MODE ?? 'mock',
      ts: Date.now()
    });

    const interval = setInterval(() => {
      if (!alive) {
        return;
      }

      send('tick', { ts: Date.now() });
    }, 1000);

    const handleClose = () => {
      if (!alive) {
        return;
      }

      alive = false;
      clearInterval(interval);
    };

    raw.on('close', handleClose);
    raw.on('error', handleClose);

    return reply;
  });
}
