import { FastifyInstance } from 'fastify';
import { coreLedgerQuery } from '../core/client.js';

export default async function healthRoutes(app: FastifyInstance) {
  app.get('/v1/health', async () => ({
    ok: true,
    service: 'workbench-bff',
    mode: process.env.AI_CORE_MODE ?? 'mock',
    ts: Date.now(),
    version:
      process.env.GIT_SHA ?? process.env.GITHUB_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev',
  }));

  app.get('/v1/api/health', async () => ({
    ok: true,
    ts: new Date().toISOString(),
    version: '0.1.0',
  }));

  app.get('/v1/api/health/deep', async () => {
    if (!process.env.CORE_GRPC_ADDR) {
      return { ok: true, core: 'disabled' };
    }

    try {
      const rows = await coreLedgerQuery({ limit: 1 });
      return { ok: true, core: 'reachable', sample: rows.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, core: 'unreachable', error: message };
    }
  });
}
