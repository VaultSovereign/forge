import type { FastifyReply, FastifyRequest } from 'fastify';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export type AuthContext = {
  sub: string;
  aud?: string | string[];
  iss?: string;
  exp?: number;
  iat?: number;
  roles: string[];
  raw: JWTPayload;
};

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getEnv(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function ensureJWKS() {
  if (jwks) return jwks;
  const override = process.env.OIDC_JWKS_URL?.trim();
  if (override) {
    jwks = createRemoteJWKSet(new URL(override));
    return jwks;
  }
  const issuer = getEnv('OIDC_ISSUER');
  const base = issuer.endsWith('/') ? issuer : issuer + '/';
  const jwksUri = new URL('.well-known/jwks.json', base);
  jwks = createRemoteJWKSet(jwksUri);
  return jwks;
}

function extractRoles(payload: JWTPayload): string[] {
  const path = process.env.RBAC_ROLES_CLAIM || 'https://vaultmesh/roles';
  const val = get(payload, path) ?? (payload as any)['roles'];
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') return [val];
  const def = process.env.RBAC_DEFAULT_ROLES;
  return def
    ? def
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
}

// Minimal dot-path accessor (a.b.c)
function get(obj: any, path: string) {
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

export async function verifyJWT(token: string): Promise<AuthContext> {
  const issuer = getEnv('OIDC_ISSUER');
  const audience = getEnv('OIDC_AUDIENCE', process.env.OIDC_CLIENT_ID);
  const keySet = await ensureJWKS();

  const { payload } = await jwtVerify(token, keySet, { issuer, audience });
  const roles = extractRoles(payload);
  return {
    sub: String(payload.sub ?? ''),
    aud: payload.aud,
    iss: (payload.iss as string | undefined) ?? undefined,
    exp: payload.exp,
    iat: payload.iat,
    roles,
    raw: payload,
  };
}

export async function authPreHandler(req: FastifyRequest, reply: FastifyReply) {
  if (process.env.AUTH_DEV_BYPASS === '1') {
    (req as FastifyRequest & { user?: AuthContext }).user = {
      sub: 'dev-bypass',
      roles: ['operator'],
      raw: {},
    };
    return;
  }
  const hdr = req.headers.authorization || '';
  if (!hdr.startsWith('Bearer ')) {
    reply.code(401).send({ ok: false, error: 'missing_bearer' });
    return;
  }
  const token = hdr.slice('Bearer '.length);
  try {
    const ctx = await verifyJWT(token);
    (req as FastifyRequest & { user?: AuthContext }).user = ctx;
  } catch (error) {
    const message = error instanceof Error ? error.message : undefined;
    reply.code(401).send({ ok: false, error: 'invalid_token', detail: message });
  }
}

// Backward-compatible export used in some routes
export function authMiddleware() {
  return async (req: FastifyRequest, reply: FastifyReply) => authPreHandler(req, reply);
}
