import type { FastifyReply, FastifyRequest } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

type RbacDoc = {
  roles: Record<string, string[]>;
  claims?: { roles_claim_path?: string; default_roles?: string[] };
};

let matrix: RbacDoc = { roles: {} };

export function loadRbacMatrix() {
  const p =
    process.env.VMESH_RBAC_PATH ||
    path.join(process.cwd(), 'workbench', 'bff', 'config', 'rbac.yaml');
  if (fs.existsSync(p)) {
    try {
      matrix = YAML.parse(fs.readFileSync(p, 'utf8')) as RbacDoc;
    } catch {
      matrix = { roles: {} };
    }
  }
  if (matrix.claims?.roles_claim_path) {
    process.env.RBAC_ROLES_CLAIM = matrix.claims.roles_claim_path;
  }
  if (matrix.claims?.default_roles?.length) {
    process.env.RBAC_DEFAULT_ROLES = matrix.claims.default_roles.join(',');
  }
}

// Accepts either a list of actions (e.g., 'templates:read') or legacy role names
export function rbac(required: string[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const userRoles = (req as FastifyRequest & { user?: { roles?: string[] } }).user?.roles ?? [];
    const roles = new Set(userRoles);

    // If all required items look like roles (no ':'), check role presence
    const looksLikeRoles = required.every((r) => !r.includes(':'));
    if (looksLikeRoles) {
      const ok = required.every((role) => roles.has(role));
      if (!ok) return reply.code(403).send({ ok: false, error: 'forbidden', need: required });
      return;
    }

    // Action-based check
    const ok = required.some((action) =>
      [...roles].some((role) => (matrix.roles[role] ?? []).includes(action))
    );
    if (!ok) {
      reply.code(403).send({ ok: false, error: 'forbidden', need: required });
    }
  };
}
