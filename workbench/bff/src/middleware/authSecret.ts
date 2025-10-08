import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Shared-secret guard for sensitive endpoints.
 * Env: FORGE_BFF_SECRET
 * Header: x-forge-secret
 */
export function requireSecret() {
  const secret = process.env.FORGE_BFF_SECRET ?? '';

  return async function guard(request: FastifyRequest, reply: FastifyReply) {
    if (!secret) {
      reply.header('x-forge-warning', 'FORGE_BFF_SECRET not set');
      return;
    }

    const header = typeof request.headers['x-forge-secret'] === 'string'
      ? request.headers['x-forge-secret'].trim()
      : Array.isArray(request.headers['x-forge-secret'])
        ? request.headers['x-forge-secret'][0]?.trim() ?? ''
        : '';

    if (header === secret) {
      return;
    }

    reply.code(401).send({ ok: false, error: 'unauthorized' });
  };
}
