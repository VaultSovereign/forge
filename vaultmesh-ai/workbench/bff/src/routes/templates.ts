import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { rbac } from '../auth/rbac.js';

const TemplatesResp = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    inputs: z.record(z.any()).optional()
  })
);

export default async function templatesRoutes(app: FastifyInstance) {
  app.get(
    '/v1/api/templates',
    { preHandler: rbac(['auditor', 'author', 'operator']) },
    async () => {
      const data = [
        {
          id: 'demo.echo',
          name: 'Echo',
          description: 'Echo args back',
          inputs: { message: { type: 'string' } }
        },
        {
          id: 'dora.ict_risk_framework.v1',
          name: 'DORA ICT Risk',
          description: 'Run ICT risk assessment'
        }
      ];
      return TemplatesResp.parse(data);
    }
  );
}
