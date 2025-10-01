import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';

const app = Fastify({ logger: true, bodyLimit: 1 * 1024 * 1024 });

await app.register(helmet);
await app.register(cors, { origin: env.CORS_LIST });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultStatic = path.resolve(__dirname, '../public');
const staticRoot = env.STATIC_DIR ? path.resolve(env.STATIC_DIR) : defaultStatic;
const hasStatic = fs.existsSync(staticRoot);

if (hasStatic) {
  await app.register(fastifyStatic, {
    root: staticRoot,
    prefix: '/',
    index: ['index.html']
  });
} else {
  app.log.warn({ staticRoot }, 'Static assets directory not found; SPA responses will return placeholder JSON.');
}

const { default: healthRoutes } = await import('./routes/health.js');
const { default: templatesRoutes } = await import('./routes/templates.js');
const { default: executeRoutes } = await import('./routes/execute.js');
const { default: ledgerRoutes } = await import('./routes/ledger.js');
const { default: tickRoutes } = await import('./routes/tick.js');

await app.register(healthRoutes);
await app.register(templatesRoutes);
await app.register(executeRoutes);
await app.register(ledgerRoutes);
await app.register(tickRoutes);

app.setNotFoundHandler((req, reply) => {
  if (req.method === 'GET' && !req.url.startsWith('/v1/api/')) {
    try {
      if (hasStatic) {
        return reply.type('text/html').sendFile('index.html');
      }
    } catch (error) {
      req.log.warn({ err: error }, 'SPA asset lookup failed; returning JSON placeholder');
    }

    return reply.send({
      ok: true,
      service: 'vaultmesh-workbench-bff',
      note: 'SPA not found; build frontend to serve static assets'
    });
  }

  reply.code(404).send({ error: 'Not Found' });
});

const port = env.PORT;
if (process.env.NODE_ENV === 'production' && env.DEV_NO_AUTH === '1') {
  app.log.warn({ env: 'production' }, 'DEV_NO_AUTH=1 — auth bypass is active. Configure OIDC before production.');
}

app
  .listen({ port, host: '0.0.0.0' })
  .then(() => app.log.info({ port, staticRoot }, 'workbench bff up'))
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });

process.on('SIGTERM', () => app.close());
process.on('SIGINT', () => app.close());
