import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fromHere } from '../utils/esm-paths.js';

type GuardianMode = 'stub' | 'agent' | 'unknown';

const TTL_MS = Number(process.env.GUARDIAN_MODE_TTL_MS ?? 1000);

const agentCandidates: string[] = (() => {
  const fromEnv = process.env.GUARDIAN_AGENT_ENTRY;
  const roots = [
    process.cwd(),
    path.resolve(process.cwd(), '.'),
    fromHere(import.meta.url, '../../..', '..', '..'),
  ];
  const rels = ['agents/build/index.js', 'agents/index.js'];
  const acc = new Set<string>();
  if (fromEnv) acc.add(path.resolve(fromEnv));
  for (const r of roots) for (const rel of rels) acc.add(path.resolve(r, rel));
  return Array.from(acc);
})();

let modeCache: { mode: GuardianMode; ts: number } = { mode: 'unknown', ts: 0 };

export async function detectMode(): Promise<GuardianMode> {
  const now = Date.now();
  if (now - modeCache.ts < TTL_MS) return modeCache.mode;

  // Explicit stub via env (primarily for dev-mode)
  if ((process.env.GUARDIAN_MODE || '').toLowerCase() === 'stub') {
    modeCache = { mode: 'stub', ts: now };
    return 'stub';
  }
  for (const candidate of agentCandidates) {
    if (!fs.existsSync(candidate)) continue;
    try {
      const mod: any = await import(pathToFileURL(candidate).href).catch(() => null);
      const askFn = mod?.askGuardian ?? mod?.ask ?? mod?.default?.askGuardian ?? mod?.default?.ask;
      if (typeof askFn === 'function') {
        modeCache = { mode: 'agent', ts: now };
        return 'agent';
      }
    } catch {
      // continue
    }
  }
  modeCache = { mode: 'stub', ts: now };
  return 'stub';
}

async function resolveAgent() {
  // Try env override, then built artifact, then JS source export
  const candidates = [
    ...(process.env.GUARDIAN_AGENT_ENTRY ? [path.resolve(process.env.GUARDIAN_AGENT_ENTRY)] : []),
    path.resolve(process.cwd(), 'agents/build/index.js'),
    path.resolve(process.cwd(), 'agents/index.js'),
    fromHere(import.meta.url, '../../..', '..', '..', 'agents/build/index.js'),
    fromHere(import.meta.url, '../../..', '..', '..', 'agents/index.js'),
  ];

  for (const spec of candidates) {
    try {
      // @ts-ignore optional runtime import; presence determines agent mode
      const mod: any = await import(pathToFileURL(spec).href);
      const askFn = mod?.askGuardian ?? mod?.ask ?? mod?.default?.askGuardian ?? mod?.default?.ask;
      if (typeof askFn === 'function') {
        return askFn as (input: string) => Promise<any>;
      }
    } catch {
      // continue to next candidate
    }
  }
  return null;
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
    },
    async (req, reply) => {
      const { input } = (req.body ?? {}) as { input?: string };
      if (!input || input.trim().length === 0) {
        return reply.code(400).send({ error: 'input is required' });
      }

      const askGuardian = await resolveAgent();
      const currentMode = await detectMode();
      if (askGuardian) {
        try {
          const result = await askGuardian(input);
          reply.header('x-guardian-mode', 'agent');
          return reply.send({
            text: result?.outputText ?? 'Agent responded.',
            events: Array.isArray(result?.events) ? result.events : [],
            mode: 'agent',
          });
        } catch (e: any) {
          reply.header('x-guardian-mode', 'stub');
          return reply.send({
            text: `Guardian (stub due to agent error): ${String(e?.message || e)}. Echo: ${input}`,
            events: [],
            mode: 'stub',
          });
        }
      }

      if (process.env.NODE_ENV === 'production' && currentMode !== 'agent') {
        reply.header('x-guardian-mode', currentMode);
        return reply.code(503).send({
          error: 'guardian_unavailable',
          note: 'Guardian agent not configured in production.',
        });
      }

      reply.header('x-guardian-mode', currentMode);
      return reply.send({ text: `Guardian (stub): ${input}`, events: [], mode: 'stub' });
    },
  );

  // Lightweight mode probe for dashboards
  app.get('/v1/guardian/mode', async (_req, reply) => {
    const mode = await detectMode();
    const ts = Date.now();
    reply
      .header('x-guardian-mode', mode)
      .header('Cache-Control', 'no-cache, max-age=0, must-revalidate')
      .header('ETag', `W/"${mode}-${Math.floor(ts / 1000)}"`);
    return reply.send({ mode, ts });
  });

  // Header-only probe (cheap for dashboards)
  app.head('/v1/guardian/mode', async (_req, reply) => {
    const mode = await detectMode();
    reply
      .header('x-guardian-mode', mode)
      .header('Cache-Control', 'no-cache, max-age=0, must-revalidate');
    return reply.status(204).send();
  });
}
