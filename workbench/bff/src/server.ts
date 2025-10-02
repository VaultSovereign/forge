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


  // Optionally expose repo docs as static files under /docs when EXPOSE_DOCS=1
  if (process.env.EXPOSE_DOCS === '1') {
    try {
      const docsRoot = path.resolve(process.cwd(), 'docs');
      if (fs.existsSync(docsRoot)) {
        await app.register(fastifyStatic, {
          root: docsRoot,
          prefix: '/docs/',
          decorateReply: false
        } as any);
        app.log.info({ docsRoot }, 'docs exposed under /docs');
      } else {
        app.log.warn({ docsRoot }, 'EXPOSE_DOCS=1 set but docs directory not found');
      }
    } catch (err) {
      app.log.warn({ err }, 'failed to expose /docs static route');
    }
  }

  const { default: healthRoutes } = await import('./routes/health.js');
  const { default: templatesRoutes } = await import('./routes/templates.js');
  const { default: shimsRoute } = await import('./routes/shims.js');
  const { default: executeRoutes } = await import('./routes/execute.js');
  const { default: ledgerRoutes } = await import('./routes/ledger.js');
  const { default: tickRoutes } = await import('./routes/tick.js');
  const { default: guardianRoute } = await import('./routes/guardian.js');
  const { default: metricsRoutes } = await import('./routes/metrics.js');
  const { default: openapiRoutes } = await import('./routes/openapi.js');
  const { default: devRoutes } = await import('./routes/dev.js');

  await app.register(healthRoutes);
  await app.register(templatesRoutes);
  await app.register(shimsRoute);
  await app.register(executeRoutes);
  await app.register(ledgerRoutes);
  await app.register(tickRoutes);
  await app.register(guardianRoute);
  await app.register(metricsRoutes);
  // Expose OpenAPI JSON only in dev unless explicitly enabled
  if (process.env.NODE_ENV !== 'production' || process.env.EXPOSE_OPENAPI === '1') {
    await app.register(openapiRoutes);
  }

  // Enable dev signer (JWKS + token mint) only when explicitly requested
  if (process.env.AUTH_DEV_SIGNER === '1') {
    await app.register(devRoutes);
  }

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
  if (process.env.NODE_ENV === 'production' && process.env.AUTH_DEV_BYPASS === '1') {
    app.log.warn({ env: 'production' }, 'AUTH_DEV_BYPASS=1 — auth bypass is active. Configure OIDC before production.');
  }
  if (process.env.NODE_ENV === 'production' && !process.env.CORE_GRPC_ADDR) {
    app.log.error('CORE_GRPC_ADDR is required in production. Set the gRPC Core address or switch to a non-production environment.');
    process.exit(1);
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
