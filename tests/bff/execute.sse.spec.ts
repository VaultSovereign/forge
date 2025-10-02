import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { loadRbacMatrix } from '../../workbench/bff/src/auth/rbac.ts';
import executeRoutes from '../../workbench/bff/src/routes/execute.ts';

describe('execute SSE route', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.AUTH_DEV_BYPASS = '1';
    // Ensure RBAC matrix is loaded so operator role has execute:run
    loadRbacMatrix();

    app = Fastify({ logger: false });

    // Register rate limit plugin (per-route configs are defined in execute.ts)
    await app.register(rateLimit, {
      global: false,
      keyGenerator: (req) => req.ip,
      addHeaders: {
        'x-ratelimit-limit': false,
        'x-ratelimit-remaining': false,
        'x-ratelimit-reset': false,
        'retry-after': false,
      },
    });

    await app.register(executeRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns 400 invalid_query when args JSON is invalid', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/api/execute/stream',
      query: {
        templateId: 'tem.noop',
        profile: 'vault',
        args: '{not-json}',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBe('invalid_query');
    expect(Array.isArray(body.issues)).toBe(true);
  });
});
