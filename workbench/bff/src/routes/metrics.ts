import type { FastifyInstance } from 'fastify';
import { Registry, collectDefaultMetrics, Gauge } from 'prom-client';

import { detectMode } from './guardian.js';

const reg = new Registry();
collectDefaultMetrics({ register: reg });

const modeGauge = new Gauge({
  name: 'guardian_mode',
  help: 'Current Guardian mode (one-hot)',
  labelNames: ['mode'] as const,
  registers: [reg],
});

async function updateModeGauge() {
  const mode = await detectMode();
  (['agent', 'stub', 'unknown'] as const).forEach((m) => {
    modeGauge.labels({ mode: m }).set(m === mode ? 1 : 0);
  });
}

export default async function metricsRoutes(app: FastifyInstance) {
  app.get('/metrics', async (_req, reply) => {
    await updateModeGauge();
    reply.header('Content-Type', reg.contentType);
    return reply.send(await reg.metrics());
  });
}
