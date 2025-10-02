import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { Counter } from 'prom-client';

import { authPreHandler } from './auth/oidc.js';
import { loadRbacMatrix } from './auth/rbac.js';
import { env } from './env.js';
import security from './security.js';
import { fromHere } from './utils/esm-paths.js';

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true, bodyLimit: 1 * 1024 * 1024 });
  app.withTypeProvider<ZodTypeProvider>();

  await app.register(security);

  // ---- Metrics: rate-limit counter
  const rateLimitExceeded = new Counter({
    name: 'bff_rate_limit_exceeded_total',
    help: 'Number of requests rejected by rate limits',
    labelNames: ['route'] as const,
  });

  // Distributed store toggle (memory | redis)
  const RL_STORE = (process.env.RATE_LIMIT_STORE ?? 'memory').toLowerCase();
  const RL_REDIS_URL = process.env.RATE_LIMIT_REDIS_URL ?? '';
  let redisClient: any = null;
  if (RL_STORE === 'redis' && RL_REDIS_URL) {
    try {
      // Prefer ioredis if available
      const mod: any = await import('ioredis').catch(() => null);
      if (mod) {
        const IORedis = mod.default || mod;
        redisClient = new IORedis(RL_REDIS_URL);
        app.log.info('rate-limit store: ioredis');
      } else {
        // Fallback to node-redis if present
        const mod2: any = await import('redis').catch(() => null);
        if (mod2?.createClient) {
          redisClient = mod2.createClient({ url: RL_REDIS_URL });
          if (typeof redisClient.connect === 'function') {
            await redisClient.connect();
          }
          app.log.info('rate-limit store: redis');
        }
      }
    } catch (err) {
      app.log.warn({ err }, 'failed to initialize redis client; falling back to memory store');
      redisClient = null;
    }
  } else if (RL_STORE === 'redis' && !RL_REDIS_URL) {
    app.log.warn('RATE_LIMIT_STORE=redis but RATE_LIMIT_REDIS_URL is empty — using memory store');
  }

  // Register rate limit plugin; use per-route configs (global disabled)
  await app.register(rateLimit, {
    global: false,
    keyGenerator: (req) => req.ip,
    // Keep headers quiet; we’ll set Retry-After only on 429
    addHeaders: {
      'x-ratelimit-limit': false,
      'x-ratelimit-remaining': false,
      'x-ratelimit-reset': false,
      'retry-after': false,
    },
    ...(redisClient ? { redis: redisClient } : {}),
    errorResponseBuilder: function (_req: any, context: any) {
      const retrySec = Math.ceil((context?.timeWindow as number) / 1000) || 60;
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        code: 'rate_limited',
        message: 'Rate limit exceeded. Please retry later.',
        limit: context?.max,
        windowSeconds: retrySec,
      };
    },
    // @ts-ignore - this is provided by plugin at runtime
    onExceeded: function (this: any, req: any, res: any) {
      // Ensure Retry-After is present for clients/backoff logic
      const tw = (this && this.timeWindow) || 60000; // default 60s
      const retrySec = Math.ceil(Number(tw) / 1000) || 60;
      try {
        if (typeof res?.header === 'function') res.header('Retry-After', String(retrySec));
        else if (typeof res?.setHeader === 'function')
          res.setHeader('Retry-After', String(retrySec));
      } catch {}
      try {
        const routeLabel =
          (req as any).routerPath ||
          (req.routeOptions && req.routeOptions.url) ||
          req.url ||
          'unknown';
        rateLimitExceeded.labels({ route: String(routeLabel) }).inc();
      } catch {}
    },
  });

  const ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean).length
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
    credentials: true,
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
      index: ['index.html'],
    });
  } else {
    app.log.warn(
      { staticRoot },
      'Static assets directory not found; SPA responses will return placeholder JSON.'
    );
  }

  // Optionally expose repo docs as static files under /docs when EXPOSE_DOCS=1
  if (process.env.EXPOSE_DOCS === '1') {
    try {
      const docsRoot = path.resolve(process.cwd(), 'docs');
      if (fs.existsSync(docsRoot)) {
        await app.register(fastifyStatic, {
          root: docsRoot,
          prefix: '/docs/',
          decorateReply: false,
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
    if (process.env.NODE_ENV === 'production') {
      app.log.error('AUTH_DEV_SIGNER is forbidden in production. Remove this env.');
      throw new Error('Dev signer forbidden in production');
    }
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
        note: 'SPA not found; build frontend to serve static assets',
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
    app.log.warn(
      { env: 'production' },
      'AUTH_DEV_BYPASS=1 — auth bypass is active. Configure OIDC before production.'
    );
  }
  if (process.env.NODE_ENV === 'production' && !process.env.CORE_GRPC_ADDR) {
    app.log.error(
      'CORE_GRPC_ADDR is required in production. Set the gRPC Core address or switch to a non-production environment.'
    );
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
