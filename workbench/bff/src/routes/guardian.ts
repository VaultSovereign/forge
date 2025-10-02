import type { FastifyInstance } from 'fastify';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// eslint-disable-next-line import/no-relative-packages
import { limitCfg } from './_limits.js';

type GuardianMode = 'stub' | 'agent' | 'unknown';

const TTL_MS = Number(process.env.GUARDIAN_MODE_TTL_MS ?? 1000);

let modeCache: { mode: GuardianMode; ts: number } = { mode: 'unknown', ts: 0 };
export async function detectMode(): Promise<GuardianMode> {
  const now = Date.now();
  if (now - modeCache.ts < TTL_MS) return modeCache.mode;

  // Explicit stub via env (primarily for dev-mode)
  if ((process.env.GUARDIAN_MODE || '').toLowerCase() === 'stub') {
    modeCache = { mode: 'stub', ts: now };
    return 'stub';
  }

  const agentPath = process.env.GUARDIAN_AGENT_ENTRY;
  if (agentPath) {
    const resolvedPath = path.resolve(agentPath);
    try {
      const mod: any = await import(pathToFileURL(resolvedPath).href).catch(() => null);
      const askFn = mod?.askGuardian ?? mod?.ask ?? mod?.default?.askGuardian ?? mod?.default?.ask;
      if (typeof askFn === 'function') {
        modeCache = { mode: 'agent', ts: now };
        return 'agent';
      }
    } catch (e) {
      // continue
    }
  }
  modeCache = { mode: 'stub', ts: now };
  return 'stub';
}

// Dependency-injected handler used by unit tests
export function makePostGuardian(resolve: () => Promise<(input: string) => Promise<any>>) {
  return async function postGuardian(req: any, reply: any) {
    // Small adapter to work with Fastify reply or minimal Express-like fakes in tests
    const send = (status: number, payload: unknown) => {
      try {
        if (typeof reply?.code === 'function' && typeof reply?.send === 'function') {
          return reply.code(status).send(payload);
        }
        if (typeof reply?.status === 'function' && typeof reply?.json === 'function') {
          return reply.status(status).json(payload);
        }
      } catch {
        // ignore and fall through
      }
      // Fallback for ultra-minimal fakes
      reply.statusCode = status;
      reply.body = payload;
      return reply;
    };

    const { input } = (req.body ?? {}) as { input?: string };
    if (!input || input.trim().length === 0) {
      return send(400, { error: 'bad_request', message: 'input is required' });
    }

    let ask: ((input: string) => Promise<any>) | undefined;
    try {
      ask = await resolve();
    } catch (e: any) {
      const code = e?.code;
      if (typeof reply?.header === 'function') {
        if (code === 'GUARDIAN_DISABLED') {
          reply.header('x-guardian-mode', 'disabled');
        } else if (code === 'GUARDIAN_RESOLUTION_FAILED') {
          reply.header('x-guardian-mode', 'unavailable');
        }
      }
      if (code === 'GUARDIAN_DISABLED') {
        return send(503, { error: 'guardian_disabled' });
      }
      if (code === 'GUARDIAN_RESOLUTION_FAILED') {
        return send(503, { error: 'guardian_unavailable' });
      }
      // Unknown resolution error
      req?.log?.error?.(e);
      if (typeof reply?.header === 'function') reply.header('x-guardian-mode', 'error');
      return send(500, { error: 'guardian_error', message: String(e?.message || e) });
    }

    try {
      const result = await ask(input);
      try {
        if (typeof reply?.header === 'function') reply.header('x-guardian-mode', 'agent');
      } catch (_e) {
        void 0;
      }
      return send(200, {
        text: result?.outputText ?? 'Agent responded.',
        events: Array.isArray(result?.events) ? result.events : [],
      });
    } catch (e: any) {
      req?.log?.error?.(e);
      if (typeof reply?.header === 'function') reply.header('x-guardian-mode', 'error');
      return send(500, { error: 'guardian_error', message: String(e?.message || e) });
    }
  };
}

// Runtime resolver for production route
async function resolveGuardian(): Promise<(input: string) => Promise<any>> {
  const agentPath = process.env.GUARDIAN_AGENT_ENTRY;
  if (!agentPath) {
    const err: any = new Error('guardian disabled');
    err.code = 'GUARDIAN_DISABLED';
    throw err;
  }
  const resolved = path.resolve(agentPath);
  const mod: any = await import(pathToFileURL(resolved).href).catch((e) => {
    const err: any = new Error(`guardian resolution failed: ${e?.message || e}`);
    err.code = 'GUARDIAN_RESOLUTION_FAILED';
    throw err;
  });
  const ask = mod?.askGuardian ?? mod?.ask ?? mod?.default?.askGuardian ?? mod?.default?.ask;
  if (typeof ask !== 'function') {
    const err: any = new Error('guardian resolution failed: ask function not found');
    err.code = 'GUARDIAN_RESOLUTION_FAILED';
    throw err;
  }
  return ask as (input: string) => Promise<any>;
}

// Back-compat export used by route registration
export const postGuardian = makePostGuardian(resolveGuardian);

export default async function guardianRoutes(app: FastifyInstance) {
  app.post(
    '/guardian/ask',
    {
      schema: {
        body: {
          type: 'object',
          required: ['input'],
          properties: { input: { type: 'string', minLength: 1 } },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              events: { type: 'array', items: { type: 'object' } },
              mode: { type: 'string' },
            },
          },
        },
      },
      // Limit agent calls to avoid abuse; defaults allow bursts but protect sustained load
      ...limitCfg('GUARDIAN_ASK_RPS', 'GUARDIAN_ASK_WINDOW', 30, '1 minute'),
    },
    postGuardian
  );

  // Lightweight mode probe for dashboards
  app.get(
    '/v1/guardian/mode',
    { ...limitCfg('GUARDIAN_MODE_RPS', 'GUARDIAN_MODE_WINDOW', 60, '1 minute') },
    async (_req, reply) => {
      const mode = await detectMode();
      const ts = Date.now();
      reply
        .header('x-guardian-mode', mode)
        .header('Cache-Control', 'no-cache, max-age=0, must-revalidate')
        .header('ETag', `W/"${mode}-${Math.floor(ts / 1000)}"`);
      return reply.send({ mode, ts });
    }
  );

  // Header-only probe (cheap for dashboards)
  app.head(
    '/v1/guardian/mode',
    { ...limitCfg('GUARDIAN_MODE_RPS', 'GUARDIAN_MODE_WINDOW', 60, '1 minute') },
    async (_req, reply) => {
      const mode = await detectMode();
      reply
        .header('x-guardian-mode', mode)
        .header('Cache-Control', 'no-cache, max-age=0, must-revalidate');
      return reply.status(204).send();
    }
  );
}
