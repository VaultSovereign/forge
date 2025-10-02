import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appendEvent, getEvent, verifyEvent } from './node';

describe('Reality Ledger', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'ledger-'));
  const prev = process.env.REALITY_LEDGER_DIR;
  const fixedDate = new Date('2025-01-02T03:04:05Z');

  beforeAll(() => {
    process.env.REALITY_LEDGER_DIR = tmp;
    vi.useFakeTimers();
    vi.setSystemTime(fixedDate);
  });

  afterAll(() => {
    if (prev) process.env.REALITY_LEDGER_DIR = prev; else delete process.env.REALITY_LEDGER_DIR;
    rmSync(tmp, { recursive: true, force: true });
    vi.useRealTimers();
  });

  it('redacts sensitive keys on write', async () => {
    const id = await appendEvent({
      template: 'tem.test',
      profile: '@vault',
      args: { token: 'secret', nested: { apiKey: 'abc' } },
      result: { ok: true },
      operator: 'spec',
    });
    const ev = await getEvent(id);
    expect(ev).toBeTruthy();
    expect(JSON.stringify(ev)).not.toContain('secret');
    expect(JSON.stringify(ev)).not.toContain('abc');
    expect(JSON.stringify(ev)).toContain('***REDACTED***');
  });

  it('redacts nested arrays and common secret aliases', async () => {
    const id = await appendEvent({
      template: 'tem.redact',
      profile: '@vault',
      args: {
        password: 'p@ss',
        headers: { authorization: 'Bearer xyz' },
        list: [{ secret: 's1' }, { token: 't2' }],
      },
      result: { ok: true },
    });
    const ev = await getEvent(id);
    const blob = JSON.stringify(ev);
    expect(blob).not.toContain('p@ss');
    expect(blob).not.toContain('Bearer xyz');
    expect(blob).not.toContain('s1');
    expect(blob).not.toContain('t2');
    expect(blob).toContain('***REDACTED***');
  });

  it('hash is stable for identical inputs', async () => {
    const id1 = await appendEvent({ template: 'tem.same', profile: '@blue', args: { x: 1 }, result: { y: 2 } });
    const id2 = await appendEvent({ template: 'tem.same', profile: '@blue', args: { x: 1 }, result: { y: 2 } });
    const e1 = await getEvent(id1);
    const e2 = await getEvent(id2);
    expect(e1?.hash).toBe(e2?.hash);
  });

  it('verifyEvent returns false if tampered', async () => {
    const id = await appendEvent({ template: 'tem.guard', profile: '@vault', args: { x: 1 }, result: { ok: true } });
    const shard = join(tmp, `events-2025-01-02.jsonl`);
    const text = readFileSync(shard, 'utf8');
    const lines = text.split('\n').filter(Boolean);
    const idx = lines.findIndex((ln) => ln.includes(id));
    expect(idx).toBeGreaterThanOrEqual(0);
    const rec = JSON.parse(lines[idx]);
    rec.output = { ok: false }; // tamper
    lines[idx] = JSON.stringify(rec);
    writeFileSync(shard, lines.join('\n') + '\n', 'utf8');
    const ok = await verifyEvent(id);
    expect(ok).toBe(false);
  });

  it('shards by date correctly', async () => {
    const id = await appendEvent({ template: 'tem.shard', profile: '@vault', args: {}, result: {} });
    const shard = join(tmp, `events-2025-01-02.jsonl`);
    const content = readFileSync(shard, 'utf8');
    expect(content).toContain(id);
  });
});
