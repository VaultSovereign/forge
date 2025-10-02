import { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { fromHere } from '../utils/esm-paths.js';

export default async function openapiRoutes(app: FastifyInstance) {
  // Dev-only exposure unless explicitly allowed
  const devAllowed = process.env.NODE_ENV !== 'production' || process.env.EXPOSE_OPENAPI === '1';
  if (!devAllowed) return;

  app.get('/v1/openapi.json', async (_req, reply) => {
    try {
      // Resolve repo root and OpenAPI artifact path
      const repoRoot = fromHere(import.meta.url, '../../..', '..', '..');
      const p = path.resolve(repoRoot, 'docs', 'openapi', 'workbench.json');
      if (!fs.existsSync(p)) {
        return reply.code(404).send({ error: 'openapi_not_found', note: 'Generate via scripts/generate-openapi.mjs' });
      }
      const text = await fs.promises.readFile(p, 'utf8');
      reply.header('cache-control', 'no-cache, max-age=0');
      return reply.type('application/json').send(JSON.parse(text));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return reply.code(500).send({ error: 'openapi_load_failed', detail: message });
    }
  });
}

