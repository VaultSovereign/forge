import Fastify from 'fastify';
import cors from '@fastify/cors';

import { getLogger } from '../../lib/logger.js';
import registerTemplateV2Routes from './routes/templates.v2.js';
import registerExecBindRoutes from './routes/execBind.v3.js';
import registerLedgerLastRoutes from './routes/ledger.last.js';
import registerDevDashboard from './routes/dev.dashboard.js';
import { requireSecret } from './middleware/authSecret.js';
import { rateLimit } from './middleware/rateLimit.js';

function parseOrigins(raw: string) {
  const entries = raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return entries.length === 0 ? ['*'] : entries;
}

export async function startServer(options: { port?: number } = {}) {
  const app = Fastify({ logger: false, trustProxy: true });
  const log = getLogger({ module: 'bff.8787.secure' });

  const rawOrigins = process.env.FORGE_CORS_ORIGINS ?? '*';
  const origins = parseOrigins(rawOrigins);
  const corsOrigin = origins.length === 1 && origins[0] === '*' ? true : origins;
  await app.register(cors, { origin: corsOrigin });

  const guard = rateLimit();
  app.addHook('onRequest', guard);

  app.get('/health', async () => ({ ok: true, ts: new Date().toISOString() }));
  await registerTemplateV2Routes(app);
  await registerLedgerLastRoutes(app);
  await registerDevDashboard(app);
  await registerExecBindRoutes(app, { preHandler: requireSecret() });

  const port = options.port ?? 8787;
  await app.listen({ host: '0.0.0.0', port });
  log.info({ port, origins }, 'Forge BFF (secure) on 8787');
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
