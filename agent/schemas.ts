export const PlanSchema = {
  type: 'object',
  required: ['goal', 'steps'],
  properties: {
    goal: { type: 'string' },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'tool', 'input'],
        properties: {
          id: { type: 'string' },
          tool: { enum: ['codex.search', 'codex.get', 'forge.run', 'ledger.append'] },
          input: { type: 'object' },
          if: { type: 'string' },
          saveAs: { type: 'string' },
        },
      },
    },
  },
} as const;

export const ExecReportSchema = {
  type: 'object',
  required: ['goal', 'results', 'ok'],
  properties: {
    goal: { type: 'string' },
    ok: { type: 'boolean' },
    results: {
      type: 'array',
      items: { type: 'object' },
    },
  },
} as const;
