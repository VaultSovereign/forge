import { describe, it, expect, vi, beforeEach } from 'vitest';
// no express/supertest dependency: call handler directly with fakes

// Mock the agents entry to isolate the route
vi.mock('../../agents/index.ts', () => ({
  askGuardian: vi.fn().mockResolvedValue({
    outputText: 'OK: 5 templates, 0 alerts',
    events: [{ type: 'tool', name: 'verify_status' }],
  }),
}));

import { postGuardian } from '../../workbench/bff/src/routes/guardian.ts';
import { askGuardian } from '../../agents/index.ts';

describe('POST /guardian/ask handler (direct)', () => {
  function makeReply() {
    const reply: any = { statusCode: 200, body: undefined, headers: {} };
    
    // Fastify's chaining API
    reply.code = (code: number) => {
      reply.statusCode = code;
      return reply;
    };
    
    reply.status = (code: number) => {
      reply.statusCode = code;
      return reply;
    };
    
    reply.send = (data: unknown) => {
      reply.body = data;
      return reply;
    };
    
    reply.header = (key: string, value: string) => {
      reply.headers[key] = value;
      return reply;
    };
    
    return reply;
  }

  it('returns 400 when input is missing', async () => {
    const req: any = { body: {} };
    const reply = makeReply();
    await postGuardian(req, reply);
    expect(reply.statusCode).toBe(400);
    expect(reply.body).toEqual({ error: 'input is required' });
  });

  it('returns agent response for valid input', async () => {
    const req: any = { body: { input: 'health check' } };
    const reply = makeReply();
    await postGuardian(req, reply);
    expect(askGuardian).toHaveBeenCalledWith('health check');
    expect(reply.statusCode).toBe(200);
    expect(reply.body.text).toBe('OK: 5 templates, 0 alerts');
    expect(reply.body.events).toEqual([{ type: 'tool', name: 'verify_status' }]);
    expect(reply.headers['x-guardian-mode']).toBe('agent');
  });

  it('propagates agent errors as stub response', async () => {
    (askGuardian as any).mockRejectedValueOnce(new Error('boom'));
    const req: any = { body: { input: 'cause error' } };
    const reply = makeReply();
    await postGuardian(req, reply);
    expect(reply.statusCode).toBe(200); // stub response, not error
    expect(reply.body.text).toContain('stub due to agent error');
    expect(reply.body.text).toContain('boom');
    expect(reply.headers['x-guardian-mode']).toBe('stub');
  });
});
