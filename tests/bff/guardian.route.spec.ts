import { describe, expect, it, vi } from 'vitest';

import { makePostGuardian } from '../../workbench/bff/src/routes/guardian.ts';

function makeReply() {
  const reply: any = { statusCode: 200, body: undefined, headers: {} };

  reply.code = (code: number) => {
    reply.statusCode = code;
    return reply;
  };

  reply.status = (code: number) => {
    reply.statusCode = code;
    return reply;
  };

  reply.send = (payload: unknown) => {
    reply.body = payload;
    return reply;
  };

  reply.header = (key: string, value: string) => {
    reply.headers[key] = value;
    return reply;
  };

  return reply;
}

describe('makePostGuardian handler', () => {
  it('returns 400 when input is missing', async () => {
    const resolve = vi.fn();
    const handler = makePostGuardian(resolve as any);
    const req: any = { body: {} };
    const reply = makeReply();

    await handler(req, reply);

    expect(resolve).not.toHaveBeenCalled();
    expect(reply.statusCode).toBe(400);
    expect(reply.body).toEqual({ error: 'bad_request', message: 'input is required' });
  });

  it('returns agent response for valid input', async () => {
    const askGuardian = vi.fn().mockResolvedValue({
      outputText: 'OK: 5 templates, 0 alerts',
      events: [{ type: 'tool', name: 'verify_status' }],
    });
    const resolve = vi.fn().mockResolvedValue(askGuardian);
    const handler = makePostGuardian(resolve);
    const req: any = { body: { input: 'health check' }, log: { error: vi.fn() } };
    const reply = makeReply();

    await handler(req, reply);

    expect(resolve).toHaveBeenCalledTimes(1);
    expect(askGuardian).toHaveBeenCalledWith('health check');
    expect(reply.statusCode).toBe(200);
    expect(reply.body).toEqual({
      text: 'OK: 5 templates, 0 alerts',
      events: [{ type: 'tool', name: 'verify_status' }],
    });
    expect(reply.headers['x-guardian-mode']).toBe('agent');
  });

  it('returns 503 when guardian agents are disabled', async () => {
    const err = new Error('disabled');
    (err as any).code = 'GUARDIAN_DISABLED';
    const resolve = vi.fn().mockRejectedValue(err);
    const handler = makePostGuardian(resolve as any);
    const req: any = { body: { input: 'status' }, log: { error: vi.fn() } };
    const reply = makeReply();

    await handler(req, reply);

    expect(reply.statusCode).toBe(503);
    expect(reply.body?.error).toBe('guardian_disabled');
    expect(reply.headers['x-guardian-mode']).toBe('disabled');
  });

  it('returns 503 when guardian cannot be resolved', async () => {
    const err = new Error('not available');
    (err as any).code = 'GUARDIAN_RESOLUTION_FAILED';
    const resolve = vi.fn().mockRejectedValue(err);
    const handler = makePostGuardian(resolve as any);
    const req: any = { body: { input: 'status' }, log: { error: vi.fn() } };
    const reply = makeReply();

    await handler(req, reply);

    expect(reply.statusCode).toBe(503);
    expect(reply.body?.error).toBe('guardian_unavailable');
    expect(reply.headers['x-guardian-mode']).toBe('unavailable');
  });

  it('returns 500 when guardian execution fails', async () => {
    const askGuardian = vi.fn().mockRejectedValue(new Error('boom'));
    const resolve = vi.fn().mockResolvedValue(askGuardian);
    const handler = makePostGuardian(resolve);
    const logError = vi.fn();
    const req: any = { body: { input: 'status' }, log: { error: logError } };
    const reply = makeReply();

    await handler(req, reply);

    expect(reply.statusCode).toBe(500);
    expect(reply.body).toEqual({ error: 'guardian_error', message: 'boom' });
    expect(reply.headers['x-guardian-mode']).toBe('error');
    expect(logError).toHaveBeenCalled();
  });
});

