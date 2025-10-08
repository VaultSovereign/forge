import type { FastifyInstance } from 'fastify';

import { TemplateExecutor } from '../../../dispatcher/executeTemplate.js';

export default async function registerTemplateV2Routes(app: FastifyInstance) {
  const executor = new TemplateExecutor();

  app.get('/v2/templates', async () => {
    const files = await executor.listTemplates();
    return { ok: true, count: files.length, files };
  });

  app.post('/v2/templates/exec', async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const keyword = typeof body.keyword === 'string' ? body.keyword : '';
    const args = (body.args as Record<string, unknown>) ?? {};
    const model = typeof body.model === 'string' ? body.model : undefined;
    const temperature = typeof body.temperature === 'number' ? body.temperature : undefined;
    const maxTokens = typeof body.maxTokens === 'number' ? body.maxTokens : undefined;

    const result = await executor.exec({ keyword, args, model, temperature, maxTokens });
    if (!result.ok) {
      return reply.code(400).send(result);
    }
    return result;
  });
}
