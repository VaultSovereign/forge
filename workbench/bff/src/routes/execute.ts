import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { authMiddleware } from '../auth/oidc.js';
import { rbac } from '../auth/rbac.js';
import { coreExecute } from '../core/client.js';

const ExecuteReq = z.object({
  templateId: z.string().min(1),
  profile: z.string().default('vault'),
  args: z.record(z.unknown()).default({}),
});

export default async function executeRoutes(app: FastifyInstance) {
  app.post(
    '/v1/api/execute',
    { preHandler: [authMiddleware(), rbac(['execute:run'])] },
    async (request) => {
      const body = ExecuteReq.parse(request.body ?? {});
      const result = await coreExecute(body);
      return result;
    }
  );

  app.get(
    '/v1/api/execute/stream',
    { preHandler: [authMiddleware(), rbac(['execute:run'])] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      // Use a Zod schema for query parameters for type safety and validation
      const QuerySchema = ExecuteReq.extend({
        args: z
          .string()
          .transform((val, ctx) => {
            try {
              return JSON.parse(val);
            } catch (e) {
              ctx.addIssue({ code: 'custom', message: 'Invalid JSON in args' });
              return z.NEVER;
            }
          })
          .default('{}'),
      });
      const parseResult = QuerySchema.safeParse(req.query ?? {});
      if (!parseResult.success) {
        return reply.code(400).send({ error: 'invalid_query', issues: parseResult.error.issues });
      }
      const { templateId, profile, args } = parseResult.data;

      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache');
      reply.raw.setHeader('X-Accel-Buffering', 'no');
      reply.raw.setHeader('Connection', 'keep-alive');
      reply.raw.flushHeaders?.();

      // SSE clients will wait this many ms before reconnecting
      reply.raw.write('retry: 5000\n\n');

      let eventId = 0;

      const send = (event: string, data: unknown) => {
        reply.raw.write(`id: ${++eventId}\n`);
        reply.raw.write(`event: ${event}\n`);
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      send('log', { line: `starting ${templateId}` });

      const ping = setInterval(() => {
        try {
          send('log', { line: '[keepalive]' });
        } catch (error) {
          req.log.warn({ err: error }, 'sse keepalive failed');
        }
      }, 15000);

      req.raw.on('close', () => {
        clearInterval(ping);
        try {
          reply.raw.end();
        } catch (error) {
          req.log.debug({ err: error }, 'sse end after close');
        }
      });

      try {
        const outcome = await coreExecute({ templateId, profile, args }, (line) => {
          try {
            send('log', { line });
          } catch (error) {
            req.log.debug({ err: error }, 'sse emit failure');
          }
        });
        send('done', outcome);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'execution failed';
        send('error', { message });
      } finally {
        clearInterval(ping);
        reply.raw.end();
      }

      return reply;
    }
  );
}
