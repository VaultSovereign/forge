import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock the OpenAI Agents SDK so we don't call the network ---
class FakeAgent {
  public name: string;
  public instructions: string;
  public tools: any[];
  public handoffs: any[];
  constructor(cfg: any) {
    this.name = cfg.name;
    this.instructions = cfg.instructions;
    this.tools = cfg.tools ?? [];
    this.handoffs = cfg.handoffs ?? [];
    // Let tests replace run implementation:
    // @ts-ignore
    this.run = vi.fn().mockResolvedValue({ outputText: '[fake-output]' });
  }
  run(_args: any): Promise<any> {
    throw new Error('should be mocked');
  }
}
const fakeTool = (def: any) => def; // pass-through, we only read shape
const fakeHandoff = (def: any) => def; // pass-through

vi.mock('@openai/agents', () => ({
  Agent: FakeAgent,
  tool: fakeTool,
  handoff: fakeHandoff,
}));

// Now import the module under test (it will see the mocked SDK)
import { triageAgent, runnerAgent, askGuardian } from '../../agents/index.ts';

describe('VaultMesh Agent skeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('constructs Guardian (triage) with expected metadata and tools', () => {
    expect(triageAgent).toBeInstanceOf(FakeAgent as any);
    expect(triageAgent.name).toBe('VaultMesh Guardian');
    expect((triageAgent as any).tools).toBeTruthy();
    // Guardian tools: listTemplates, listLedger, verifyStatus
    const toolNames = (triageAgent as any).tools.map((t: any) => t?.name).sort();
    expect(toolNames).toEqual(['list_ledger', 'list_templates', 'verify_status'].sort());
  });

  it('constructs Runner with run_template and list_ledger tools', () => {
    expect(runnerAgent).toBeInstanceOf(FakeAgent as any);
    const toolNames = (runnerAgent as any).tools.map((t: any) => t?.name).sort();
    expect(toolNames).toEqual(['list_ledger', 'run_template'].sort());
  });

  it('askGuardian delegates to triageAgent.run with given input', async () => {
    // Spy on the instance method created in constructor
    const spy = vi.spyOn(triageAgent as any, 'run').mockResolvedValue({
      outputText: 'Latest: 3 events; 1 error.',
      events: [{ type: 'tool', name: 'list_ledger' }],
    });

    const result = await askGuardian('List latest ledger events');
    expect(spy).toHaveBeenCalledTimes(1);
    expect((spy as any).mock.calls[0][0]).toMatchObject({
      model: expect.any(String),
      input: 'List latest ledger events',
    });
    expect((result as any).outputText).toBe('Latest: 3 events; 1 error.');
  });
});

