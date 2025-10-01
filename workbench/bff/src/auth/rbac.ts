import { FastifyReply, FastifyRequest } from 'fastify';

type Role = 'operator' | 'auditor' | 'author';

export function rbac(required: Role[]) {
  return async (_req: FastifyRequest, reply: FastifyReply) => {
    // TODO: extract roles from verified JWT claims
    const devRoles: Role[] = ['operator', 'auditor', 'author'];
    const ok = required.every((role) => devRoles.includes(role));
    if (!ok) {
      reply.code(403).send({ error: 'Forbidden' });
    }
  };
}
