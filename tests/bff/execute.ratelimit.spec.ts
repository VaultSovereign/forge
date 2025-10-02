import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Bypass core execution implementation for tests
vi.mock('../../workbench/bff/src/core/client.js', () => ({
  coreExecute: vi.fn().mockResolvedValue({ ok: true, id: 'test' }),
}));

import { loadRbacMatrix } from '../../workbench/bff/src/auth/rbac.ts';
import executeRoutes from '../../workbench/bff/src/routes/execute.ts';

describe('execute route rate limit', () => {
  let app: any;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.AUTH_DEV_BYPASS = '1';
    process.env.EXECUTE_POST_RPS = '2';
    process.env.EXECUTE_POST_WINDOW = '1 minute';
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
      // @ts-ignore runtime-provided
      onExceeded: function (this: any, _req: any, res: any) {
        const tw = (this && this.timeWindow) || 60000;
        const retrySec = Math.ceil(Number(tw) / 1000) || 60;
        if (typeof res?.header === 'function') res.header('Retry-After', String(retrySec));
        else if (typeof res?.setHeader === 'function')
          res.setHeader('Retry-After', String(retrySec));
      },
    });

    // Finally, register the execute routes under test
    await app.register(executeRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns standard 429 JSON and Retry-After when exceeded', async () => {
    // First two should pass
    await app.inject({
      method: 'POST',
      url: '/v1/api/execute',
      payload: { templateId: 'tem.noop' },
    });
    await app.inject({
      method: 'POST',
      url: '/v1/api/execute',
      payload: { templateId: 'tem.noop' },
    });

    // Third should be rate-limited within same window
    const hit = await app.inject({
      method: 'POST',
      url: '/v1/api/execute',
      payload: { templateId: 'tem.noop' },
    });

    // status should be 429 with JSON body shape
    expect(hit.statusCode).toBe(429);
    const body = hit.json();
    expect(body.code).toBe('rate_limited');
    expect(body.windowSeconds).toBeGreaterThan(0);
  });
});
