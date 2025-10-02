import { FastifyInstance } from 'fastify';

import { rbac } from '../auth/rbac.js';
import { limitCfg } from './_limits.js';
import { coreLedgerQuery } from '../core/client.js';

export default async function ledgerRoutes(app: FastifyInstance) {
  app.get(
    '/v1/api/ledger/events',
    {
      preHandler: rbac(['ledger:read']),
      ...limitCfg('LEDGER_EVENTS_RPS', 'LEDGER_EVENTS_WINDOW', 60, '1 minute'),
    },
    async (request) => {
      const { template, limit } = (request.query ?? {}) as {
        template?: string;
        limit?: string;
      };
      const rows = await coreLedgerQuery({
        template,
        limit: limit ? Number(limit) : 50,
      });
      return { total: rows.length, rows };
    }
  );
}
