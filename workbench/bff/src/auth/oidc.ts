import { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../env.js';

export function authMiddleware() {
  const devBypass = env.DEV_NO_AUTH === '1';
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (devBypass) return;

    const hdr = req.headers.authorization || '';
    if (!hdr.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }

    // TODO: implement OIDC JWT verification with JWKS (jose) when DEV_NO_AUTH=0
  };
}
