import type { FastifyInstance } from 'fastify';

function buildQS(q: Record<string, string | null | undefined>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v != null && v !== '') usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

import { resolveTemplateId } from '../utils/template-resolver.js';

export default async function shimsRoute(app: FastifyInstance) {
  // GET /templates → /v1/api/templates
  app.get('/templates', async (req, reply) => {
    const url = new URL(req.url, 'http://shim');
    const filter = url.searchParams.get('filter');
    const limit = url.searchParams.get('limit');
    const cursor = url.searchParams.get('cursor');
    const r = await app.inject({
      method: 'GET',
      url: `/v1/api/templates${buildQS({ filter, limit, cursor })}`,
      headers: {
        ...(req.headers.authorization ? { authorization: String(req.headers.authorization) } : {}),
        accept: 'application/json'
      }
    });
    reply.headers(r.headers);
    reply.status(r.statusCode);
    return reply.send(r.body);
  });

  // GET /ledger → /v1/api/ledger/events
  app.get('/ledger', async (req, reply) => {
    const r = await app.inject({ method: 'GET', url: '/v1/api/ledger/events', headers: { ...(req.headers.authorization ? { authorization: String(req.headers.authorization) } : {}), accept: 'application/json' } });
    reply.headers(r.headers);
    reply.status(r.statusCode);
    return reply.send(r.body);
  });

  // POST /run/:id → /v1/api/execute
  app.post('/run/:id', async (req, reply) => {
    const rawId = (req.params as any).id as string;
    const id = resolveTemplateId(rawId);
    if (!id) {
      reply.code(404);
      return reply.send({ error: `Template not found: ${rawId}` });
    }
    const body = (req.body as any) ?? {};
    const args = body?.args ?? body;
    const r = await app.inject({
      method: 'POST',
      url: '/v1/api/execute',
      payload: { templateId: id, args },
      headers: { 'content-type': 'application/json', ...(req.headers.authorization ? { authorization: String(req.headers.authorization) } : {}), accept: 'application/json' }
    });
    reply.headers(r.headers);
    reply.status(r.statusCode);
    return reply.send(r.body);
  });
}
