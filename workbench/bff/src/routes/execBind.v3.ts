import type {
  FastifyInstance,
  FastifyRequestHandler,
  RouteShorthandOptions,
} from 'fastify';

import { executeAndBindWithPrev } from '../../../executor/ledgerBinder.prev.js';
import { initSse } from '../../sse.js';

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ExecBindRouteOptions {
  preHandler?: FastifyRequestHandler | FastifyRequestHandler[];
}

export default async function registerExecBindRoutes(
  app: FastifyInstance,
  options: ExecBindRouteOptions = {},
) {
  const routeOptions: RouteShorthandOptions = options.preHandler
    ? { preHandler: options.preHandler }
    : {};

  app.get('/v3/run/stream', routeOptions, async (request, reply) => {
    const query = (request.query ?? {}) as Record<string, unknown>;
    const keyword = typeof query.keyword === 'string' ? query.keyword.trim() : '';
    const sse = initSse(request, reply, { route: 'v3/run/stream', keyword });

    if (!keyword) {
      sse.send('error', { ok: false, error: 'missing_keyword' });
      sse.close();
      return;
    }

    let parsedArgs: Record<string, unknown> | undefined;
    if (typeof query.args === 'string' && query.args.trim().length > 0) {
      try {
        parsedArgs = JSON.parse(query.args);
      } catch (error) {
        sse.send('error', { ok: false, error: 'invalid_args_json', detail: String(error) });
        sse.close();
        return;
      }
    }

    const model = typeof query.model === 'string' && query.model.trim().length > 0 ? query.model.trim() : undefined;
    const actor = typeof query.actor === 'string' && query.actor.trim().length > 0 ? query.actor.trim() : undefined;
    const traceId = typeof query.traceId === 'string' && query.traceId.trim().length > 0 ? query.traceId.trim() : undefined;
    const ledgerDir = typeof query.ledgerDir === 'string' && query.ledgerDir.trim().length > 0 ? query.ledgerDir.trim() : undefined;
    const temperature = toNumber(query.temperature);
    const maxTokens = toNumber(query.maxTokens);

    try {
      sse.send('progress', { step: 'resolve-template', keyword });
      await sleep(50);
      sse.send('progress', { step: 'render-prompts', keyword });
      await sleep(50);
      sse.send('progress', { step: 'call-llm', keyword, model });

      const result = await executeAndBindWithPrev({
        keyword,
        args: parsedArgs,
        model,
        temperature,
        maxTokens,
        actor,
        traceId,
        ledgerDir,
      });

      sse.send('progress', { step: 'append-ledger', day: result.day, hash: result.hash });
      await sleep(25);
      sse.send('done', result);
    } catch (error) {
      sse.send('error', { ok: false, error: 'execution_failed', detail: String(error) });
    } finally {
      sse.close();
    }
  });
}
