import Fastify from 'fastify';
import cors from '@fastify/cors';

import { getLogger } from '../../lib/logger.js';
import registerTemplateV2Routes from './routes/templates.v2.js';

export async function startServer(options: { port?: number } = {}) {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });
  const log = getLogger({ module: 'bff.v3' });

  app.get('/health', async () => ({ ok: true, ts: new Date().toISOString() }));
  await registerTemplateV2Routes(app);

  const port = options.port ?? Number(process.env.PORT ?? 3002);
  await app.listen({ host: '0.0.0.0', port });
  log.info({ port }, 'Forge BFF v3 listening');
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
