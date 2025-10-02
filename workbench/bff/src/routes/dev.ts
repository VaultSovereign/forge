import type { FastifyInstance } from 'fastify';
import { jwks, signDevJWT } from '../dev/keys.js';

export default async function devRoutes(app: FastifyInstance) {
  if (process.env.AUTH_DEV_SIGNER !== '1') return;

  app.get('/dev/jwks.json', async () => {
    return await jwks();
  });

  app.post('/v1/dev/token', async (req) => {
    const body = (req.body ?? {}) as { sub?: string; roles?: string[] };
    const token = await signDevJWT({
      sub: body.sub || 'dev-ci',
      ['https://vaultmesh/roles']: Array.isArray(body.roles) ? body.roles : ['operator', 'auditor'],
    });
    return { token };
  });
}
