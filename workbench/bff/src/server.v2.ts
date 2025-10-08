import Fastify from 'fastify';
import cors from '@fastify/cors';

import { initSse } from '../sse.js';
import { getLogger } from '../../../lib/logger.js';

export async function startServer(options: { port?: number } = {}) {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });
  const log = getLogger({ module: 'workbench-bff.v2' });

  app.get('/health', async () => ({ ok: true, ts: new Date().toISOString() }));

  app.get('/sse/execute', async (req, reply) => {
    const traceId = String((req.query as Record<string, unknown>)?.traceId ?? '');
    const sse = initSse(req, reply, { route: 'sse.execute.v2', traceId });

    sse.send('progress', { step: 'resolve-template' });
    await delay(300);
    sse.send('progress', { step: 'prepare-prompts' });
    await delay(300);
    sse.send('progress', { step: 'call-llm' });
    await delay(300);
    sse.send('done', { ok: true });
    sse.close();
  });

  const port = options.port ?? Number(process.env.PORT ?? 3001);
  await app.listen({ host: '0.0.0.0', port });
  log.info({ port }, 'Forge BFF v2 listening');
  return app;
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
