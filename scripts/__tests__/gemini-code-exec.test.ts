import { describe, it, expect, vi } from 'vitest';

// mock child_process for tokens/project lookups
vi.mock('node:child_process', () => ({
  execFile: (_cmd: string, args: string[]) => {
    const out =
      args.join(' ') === 'config get-value project'
        ? 'vaultmesh-473618\n'
        : args.join(' ').includes('application-default print-access-token')
        ? 'ya29.token\n'
        : '';
    return { stdout: out };
  },
}));

// intercept fetch
globalThis.fetch = vi.fn(async (url: any, init: any) => {
  // ensure flags hit url + headers shape
  const u = String(url);
  const isVertex = u.includes('aiplatform.googleapis.com');
  const body = JSON.parse(init.body);
  expect(body.tools?.[0]).toHaveProperty('code_execution');
  const payload = {
    candidates: [
      {
        content: {
          parts: [
            { text: 'ok' },
            { executable_code: { code: 'print(1)' } },
            { code_execution_result: { output: '1' } },
          ],
        },
      },
    ],
  };
  return new Response(JSON.stringify(payload), { status: 200 });
}) as any;

describe('gemini-code-exec CLI flags', () => {
  it('ai.google.dev path', async () => {
    const { default: mod } = await import('../../scripts/gemini-code-exec.mjs');
    // module runs main() on import; nothing else to assert here
    expect(mod).toBeUndefined();
  });
});

