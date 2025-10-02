import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Mock coreExecute to emit a log and return a done payload
vi.mock('../../workbench/bff/src/core/client.js', () => ({
  coreExecute: vi.fn(async (_payload: any, onLog?: (line: string) => void) => {
    onLog?.('hello');
    return { ok: true, id: 'demo' };
  }),
}));

import { loadRbacMatrix } from '../../workbench/bff/src/auth/rbac.ts';
import executeRoutes from '../../workbench/bff/src/routes/execute.ts';

describe('execute SSE route (happy path)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.AUTH_DEV_BYPASS = '1';
    loadRbacMatrix();

    app = Fastify({ logger: false });
    await app.register(rateLimit, { global: false });
    await app.register(executeRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('streams log and done events', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/api/execute/stream',
      query: {
        templateId: 'tem.noop',
        profile: 'vault',
        args: JSON.stringify({}),
      },
    });

    expect(res.statusCode).toBe(200);
    const txt = res.body?.toString() ?? '';
    expect(txt).toContain('event: log');
    expect(txt).toContain('hello');
    expect(txt).toContain('event: done');
  });
});

