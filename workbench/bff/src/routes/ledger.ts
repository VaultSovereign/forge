import { FastifyInstance } from 'fastify';
import { rbac } from '../auth/rbac.js';
import { coreLedgerQuery } from '../core/client.js';

export default async function ledgerRoutes(app: FastifyInstance) {
  app.get(
    '/v1/api/ledger/events',
    { preHandler: rbac(['auditor', 'operator']) },
    async (request) => {
      const { template, limit } = (request.query ?? {}) as {
        template?: string;
        limit?: string;
      };
      const rows = await coreLedgerQuery({
        template,
        limit: limit ? Number(limit) : 50
      });
      return { total: rows.length, rows };
    }
  );
}
