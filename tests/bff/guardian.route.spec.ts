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
  function makeRes() {
    const res: any = { statusCode: 200, body: undefined };
    res.status = (code: number) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data: unknown) => {
      res.body = data;
      return res;
    };
    return res;
  }

  it('returns 400 when input is missing', async () => {
    const req: any = { body: {} };
    const res = makeRes();
    await postGuardian(req, res as any);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'input (string) required' });
  });

  it('returns agent response for valid input', async () => {
    const req: any = { body: { input: 'health check' } };
    const res = makeRes();
    await postGuardian(req, res as any);
    expect(askGuardian).toHaveBeenCalledWith('health check');
    expect(res.statusCode).toBe(200);
    expect(res.body.text).toBe('OK: 5 templates, 0 alerts');
    expect(res.body.events).toEqual([{ type: 'tool', name: 'verify_status' }]);
  });

  it('propagates agent errors as 500', async () => {
    (askGuardian as any).mockRejectedValueOnce(new Error('boom'));
    const req: any = { body: { input: 'cause error' } };
    const res = makeRes();
    await postGuardian(req, res as any);
    expect(res.statusCode).toBe(500);
    expect((res.body as any).error).toContain('boom');
  });
});
