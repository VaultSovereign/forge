import Fastify from 'fastify';
import cors from '@fastify/cors';

import { getLogger } from '../../lib/logger.js';
import registerTemplateV2Routes from './routes/templates.v2.js';
import registerExecBindRoutes from './routes/execBind.v3.js';
import registerLedgerLastRoutes from './routes/ledger.last.js';
import registerDevDashboard from './routes/dev.dashboard.js';

export async function startServer(options: { port?: number } = {}) {
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });
  const log = getLogger({ module: 'bff.8787.dashboard' });

  app.get('/health', async () => ({ ok: true, ts: new Date().toISOString() }));
  await registerTemplateV2Routes(app);
  await registerExecBindRoutes(app);
  await registerLedgerLastRoutes(app);
  await registerDevDashboard(app);

  const port = options.port ?? 8787;
  await app.listen({ host: '0.0.0.0', port });
  log.info({ port }, 'Forge BFF (dashboard) on 8787');
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
