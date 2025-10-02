import path from 'node:path';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { fromHere, pathToFileURL } from '../utils/esm-paths.js';
import { limitCfg } from './_limits.js';

type GuardianMode = 'stub' | 'agent' | 'unknown';

type GuardianResult = { outputText?: string; events?: unknown[] };
type AskGuardianFn = (input: string) => Promise<GuardianResult>;
type ResolveGuardianFn = () => Promise<AskGuardianFn>;

interface GuardianError extends Error {
  code?: string;
}

const DISABLED_VALUES = new Set(['0', 'false', 'off', 'disabled']);
const DEFAULT_AGENT_PATHS = [
  '../../../../agents/index.js',
  '../../../../agents/index.mjs',
  '../../../../agents/index.ts',
];

let agentCache: { key: string | null; fn: AskGuardianFn | null } = {
  key: null,
  fn: null,
};

const TTL_MS = Number(process.env.GUARDIAN_MODE_TTL_MS ?? 1000);
let modeCache: { mode: GuardianMode; ts: number } = { mode: 'unknown', ts: 0 };

function createError(message: string, code: string): GuardianError {
  const err = new Error(message) as GuardianError;
  err.code = code;
  return err;
}

function pickAskGuardian(mod: any): AskGuardianFn | null {
  const fn =
    mod?.askGuardian ?? mod?.ask ?? mod?.default?.askGuardian ?? (typeof mod?.default === 'function' ? mod.default : null);
  return typeof fn === 'function' ? (fn as AskGuardianFn) : null;
}

async function defaultResolveGuardian(): Promise<AskGuardianFn> {
  const gate = process.env.GUARDIAN_AGENTS_ENABLED;
  if (gate && DISABLED_VALUES.has(gate.toLowerCase())) {
    throw createError('Guardian agents disabled by configuration', 'GUARDIAN_DISABLED');
  }

  const explicitEntry = process.env.GUARDIAN_AGENT_ENTRY;
  const candidates: Array<{ key: string; url: string }> = [];

  if (explicitEntry) {
    const resolved = path.resolve(explicitEntry);
    candidates.push({ key: resolved, url: pathToFileURL(resolved).href });
  } else {
    for (const rel of DEFAULT_AGENT_PATHS) {
      const absolute = fromHere(import.meta.url, rel);
      candidates.push({ key: absolute, url: pathToFileURL(absolute).href });
    }
  }

  for (const candidate of candidates) {
    if (agentCache.key === candidate.key && agentCache.fn) {
      return agentCache.fn;
    }
    try {
      const mod: any = await import(candidate.url);
      const askFn = pickAskGuardian(mod);
      if (askFn) {
        agentCache = { key: candidate.key, fn: askFn };
        return askFn;
      }
    } catch (error) {
      continue;
    }
  }

  if (explicitEntry) {
    throw createError(`Guardian agent entry not loadable: ${explicitEntry}`, 'GUARDIAN_RESOLUTION_FAILED');
  }

  throw createError('Guardian agent module not available. Provide GUARDIAN_AGENT_ENTRY or install agents.', 'GUARDIAN_RESOLUTION_FAILED');
}

type GuardianRequest = FastifyRequest<{ Body: { input?: string } }>;

export function makePostGuardian(resolve: ResolveGuardianFn = defaultResolveGuardian) {
  return async function postGuardian(req: GuardianRequest, reply: FastifyReply) {
    const rawInput = req.body?.input;
    const input = typeof rawInput === 'string' ? rawInput.trim() : '';

    if (!input) {
      return reply.code(400).send({ error: 'bad_request', message: 'input is required' });
    }

    try {
      const askGuardian = await resolve();
      const result = await askGuardian(input);
      reply.header('x-guardian-mode', 'agent');
      return reply.code(200).send({
        text: result?.outputText ?? 'Agent responded.',
        events: Array.isArray(result?.events) ? result.events : [],
      });
    } catch (error) {
      const err = error as GuardianError;

      if (err?.code === 'GUARDIAN_DISABLED') {
        reply.header('x-guardian-mode', 'disabled');
        return reply.code(503).send({
          error: 'guardian_disabled',
          message: 'Guardian agents disabled by configuration. Set GUARDIAN_AGENTS_ENABLED=1 to enable.',
        });
      }

      if (err?.code === 'GUARDIAN_RESOLUTION_FAILED') {
        reply.header('x-guardian-mode', 'unavailable');
        return reply.code(503).send({
          error: 'guardian_unavailable',
          message: err.message || 'Guardian agent is unavailable. Provide GUARDIAN_AGENT_ENTRY to enable it.',
        });
      }

      req.log?.error({ err }, 'guardian execution failed');
      reply.header('x-guardian-mode', 'error');
      return reply.code(500).send({
        error: 'guardian_error',
        message: err?.message || 'Guardian agent failed to execute.',
      });
    }
  };
}

export const postGuardian = makePostGuardian();

export async function detectMode(): Promise<GuardianMode> {
  const now = Date.now();
  if (now - modeCache.ts < TTL_MS) return modeCache.mode;

  const explicit = (process.env.GUARDIAN_MODE || '').toLowerCase();
  if (explicit === 'stub') {
    modeCache = { mode: 'stub', ts: now };
    return 'stub';
  }

  try {
    await defaultResolveGuardian();
    modeCache = { mode: 'agent', ts: now };
    return 'agent';
  } catch {
    modeCache = { mode: 'stub', ts: now };
    return 'stub';
  }
}

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
      ...limitCfg('GUARDIAN_ASK_RPS', 'GUARDIAN_ASK_WINDOW', 30, '1 minute'),
    },
    postGuardian
  );

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

