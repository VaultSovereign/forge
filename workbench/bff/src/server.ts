import Fastify, { type FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { env } from './env.js';
import { fromHere } from './utils/esm-paths.js';
import security from './security.js';
import { authPreHandler } from './auth/oidc.js';
import { loadRbacMatrix } from './auth/rbac.js';

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true, bodyLimit: 1 * 1024 * 1024 });
  app.withTypeProvider<ZodTypeProvider>();

  await app.register(security);

  const ORIGINS = ((process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)).length
    ? (process.env.ALLOWED_ORIGINS as string)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : env.CORS_LIST;

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      cb(null, ORIGINS.includes(origin));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  });

  // Load RBAC matrix and set claim envs
  loadRbacMatrix();

  // Protect API routes with OIDC (bypassable in dev via AUTH_DEV_BYPASS=1)
  app.addHook('preHandler', async (req, reply) => {
    if (req.url.startsWith('/v1/api/')) {
      await authPreHandler(req, reply);
    }
  });

  const defaultStatic = fromHere(import.meta.url, '../public');
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
  const { default: shimsRoute } = await import('./routes/shims.js');
  const { default: executeRoutes } = await import('./routes/execute.js');
  const { default: ledgerRoutes } = await import('./routes/ledger.js');
  const { default: tickRoutes } = await import('./routes/tick.js');
  const { default: guardianRoute } = await import('./routes/guardian.js');
  const { default: metricsRoutes } = await import('./routes/metrics.js');

  await app.register(healthRoutes);
  await app.register(templatesRoutes);
  await app.register(shimsRoute);
  await app.register(executeRoutes);
  await app.register(ledgerRoutes);
  await app.register(tickRoutes);
  await app.register(guardianRoute);
  await app.register(metricsRoutes);

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

  return app;
}

// If executed directly (node dist/server.js), start the server
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const app = await buildServer();
  const port = env.PORT;
  if (process.env.NODE_ENV === 'production' && env.DEV_NO_AUTH === '1') {
    app.log.warn({ env: 'production' }, 'DEV_NO_AUTH=1 — auth bypass is active. Configure OIDC before production.');
  }
  app
    .listen({ port, host: '0.0.0.0' })
    .then(() => app.log.info({ port }, 'workbench bff up'))
    .catch((error) => {
      app.log.error(error);
      process.exit(1);
    });
  process.on('SIGTERM', () => app.close());
  process.on('SIGINT', () => app.close());
}
