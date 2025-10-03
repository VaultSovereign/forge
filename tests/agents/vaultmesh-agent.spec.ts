import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock the OpenAI Agents SDK so we don't call the network ---
type AgentTool = { name?: string; [key: string]: unknown };
type AgentRunArgs = Record<string, unknown>;
type AgentRunResult = { outputText: string; events?: Array<Record<string, unknown>> };

vi.mock('@openai/agents', () => {
  // Define all mocks inside the factory to avoid TDZ (Temporal Dead Zone) issues
  class FakeAgent {
    public name: string;
    public instructions: string;
    public tools: AgentTool[];
    public handoffs: AgentTool[];
    public run: (args: AgentRunArgs) => Promise<AgentRunResult>;

    constructor(cfg: {
      name: string;
      instructions: string;
      tools?: AgentTool[];
      handoffs?: AgentTool[];
    }) {
      this.name = cfg.name;
      this.instructions = cfg.instructions;
      this.tools = cfg.tools ?? [];
      this.handoffs = cfg.handoffs ?? [];
      // Let tests replace run implementation:
      this.run = vi.fn(async () => ({ outputText: '[fake-output]' }));
    }
  }
  const fakeTool = <T>(def: T) => def; // pass-through, we only read shape
  const fakeHandoff = <T>(def: T) => def; // pass-through

  return {
    Agent: FakeAgent,
    tool: fakeTool,
    handoff: fakeHandoff,
  };
});

// Now import the module under test (it will see the mocked SDK)
import { triageAgent, runnerAgent, askGuardian } from '../../agents/vaultmesh-agent';

type MockedAgent = {
  run: (args: AgentRunArgs) => Promise<AgentRunResult>;
  tools: AgentTool[];
  handoffs?: AgentTool[];
};

function asMockedAgent(value: unknown): MockedAgent {
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as MockedAgent).run === 'function' &&
    Array.isArray((value as MockedAgent).tools)
  ) {
    return value as MockedAgent;
  }
  throw new Error('Agent mock not initialized correctly');
}

describe('VaultMesh Agent skeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('constructs Guardian (triage) with expected metadata and tools', () => {
    // Check it's an instance of the mocked Agent class (has expected structure)
    const triage = asMockedAgent(triageAgent);
    expect(triage).toBeDefined();
    expect(typeof triage.run).toBe('function');
    expect(triageAgent.name).toBe('VaultMesh Guardian');
    expect(triage.tools).toBeTruthy();
    // Guardian tools: listTemplates, listLedger, verifyStatus
    const toolNames = triage.tools
      .map((t) => (typeof t.name === 'string' ? t.name : ''))
      .filter(Boolean)
      .sort();
    expect(toolNames).toEqual(['list_ledger', 'list_templates', 'verify_status'].sort());
  });

  it('constructs Runner with run_template and list_ledger tools', () => {
    const runner = asMockedAgent(runnerAgent);
    expect(runner).toBeDefined();
    expect(typeof runner.run).toBe('function');
    const toolNames = runner.tools
      .map((t) => (typeof t.name === 'string' ? t.name : ''))
      .filter(Boolean)
      .sort();
    expect(toolNames).toEqual(['list_ledger', 'run_template'].sort());
  });

  it('askGuardian delegates to triageAgent.run with given input', async () => {
    // Spy on the instance method created in constructor
    const triage = asMockedAgent(triageAgent);
    const spy = vi.spyOn(triage, 'run').mockResolvedValue({
      outputText: 'Latest: 3 events; 1 error.',
      events: [{ type: 'tool', name: 'list_ledger' }],
    });

    const result = await askGuardian('List latest ledger events');
    expect(spy).toHaveBeenCalledTimes(1);
    const firstCall = spy.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(firstCall).toMatchObject({
      model: expect.any(String),
      input: 'List latest ledger events',
    });
    expect((result as AgentRunResult).outputText).toBe('Latest: 3 events; 1 error.');
  });
});