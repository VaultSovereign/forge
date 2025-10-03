import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// SUT: import after mocks
vi.mock('node:child_process', () => {
  return {
    execFile: (..._args: any[]) => {
      throw new Error('execFile should be promisified via util.promisify');
    },
  };
});

vi.mock('node:util', async () => {
  // mock promisify to wrap a fake execFile returning our canned JSON
  const fake = (cmd: string, args: string[]) => {
    if (cmd !== 'node') throw new Error('unexpected command: ' + cmd);
    const isVertex = args.includes('--vertex');
    const payload = {
      provider: isVertex ? 'vertex' : 'ai.google.dev',
      model: 'gemini-2.5-flash',
      location: isVertex ? 'europe-west1' : undefined,
      prompt: 'sum of first 50 primes',
      parts: [{ type: 'text', text: 'ok' }, { type: 'code', code: 'print(1)' }, { type: 'output', output: '1' }],
    };
    return Promise.resolve({ stdout: JSON.stringify(payload) });
  };
  return {
    promisify: () => fake,
  };
});

// Node18/20 fetch is global; nothing needed for these tests
// Now we can import the SUT
import { askGuardian } from '../my-assistant';

describe('my-assistant Gemini intents', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs ai.google.dev path via "gemini code <task>"', async () => {
    const res = await askGuardian('gemini code sum of first 50 primes');
    expect(res.outputText).toContain('Gemini code-exec ok');
    expect(res.outputText).toContain('"provider": "ai.google.dev"');
    expect(res.events?.[0]).toMatchObject({ type: 'gemini.code' });
  });

  it('runs Vertex path via "gemini vertex code <task>"', async () => {
    process.env.GEMINI_VERTEX_LOCATION = 'europe-west1';
    const res = await askGuardian('gemini vertex code sum of first 50 primes');
    expect(res.outputText).toContain('Gemini (Vertex) code-exec ok');
    expect(res.outputText).toContain('"provider": "vertex"');
  });
});
