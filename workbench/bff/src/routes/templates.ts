import { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { TemplateMeta, TemplateCount } from '../../../types/templates.js';
import { rbac } from '../auth/rbac.js';
import { listTemplates, countTemplates } from '../providers/catalog.js';

export default async function templatesRoutes(app: FastifyInstance) {
  const appZ = app.withTypeProvider<ZodTypeProvider>();

  const TemplateMetaSchema = z
    .object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      version: z.string().optional(),
      tags: z.array(z.string()).optional(),
      updatedAt: z.string().optional(), // ISO
    })
    .passthrough();

  const TemplateArrayResponse = z.array(TemplateMetaSchema);
  const TemplateCountResponse = z.object({ total: z.number() });
  // Backward-compatible response: array of summaries
  appZ.get(
    '/v1/api/templates',
    {
      preHandler: rbac(['templates:read']),
      schema: { response: { 200: TemplateArrayResponse } },
    },
    async (request, reply): Promise<TemplateMeta[]> => {
      const q = (request.query ?? {}) as Record<string, string>;
      const limit = q.limit ? Number(q.limit) : undefined;
      const cursor = (q.cursor as string | undefined) ?? null;
      const filter = (q.filter as string | undefined) ?? null;

      const { items, nextCursor, total } = listTemplates({ limit, cursor, filter });
      // Include pagination metadata as headers (non-breaking for existing FE)
      if (nextCursor) reply.header('x-next-cursor', nextCursor);
      reply.header('x-total-count', String(total));

      // Return array of summaries to keep existing UI intact
      return items.map((t) => ({ id: t.id, name: t.name, description: t.description }));
    }
  );

  // Tiny count endpoint for Overview and dashboards
  appZ.get(
    '/v1/api/templates/count',
    {
      preHandler: rbac(['templates:read']),
      schema: { response: { 200: TemplateCountResponse } },
    },
    async (request): Promise<TemplateCount> => {
      const q = (request.query ?? {}) as Record<string, string>;
      const filter = (q.filter as string | undefined) ?? null;
      return { total: countTemplates(filter) };
    }
  );
}
