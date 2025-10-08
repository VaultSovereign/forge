#!/usr/bin/env -S node --loader ts-node/esm
/**
 * Run a template by keyword and bind the result into the ledger.
 */

import { executeAndBindWithPrev } from '../executor/ledgerBinder.prev.js';

type Argv = {
  _: string[];
  args?: string;
  model?: string;
  temperature?: string;
  maxTokens?: string;
  actor?: string;
  traceId?: string;
  ledgerDir?: string;
};

function parseArgv(argv: string[]): Argv {
  const out: Argv = { _: [] };
  const iter = argv[Symbol.iterator]();
  for (const token of iter) {
    if (!token.startsWith('--')) {
      out._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = iter.next();
    const value = next.done ? undefined : next.value;
    (out as unknown as Record<string, string | undefined>)[key] = value;
  }
  return out;
}

async function main(argv: string[]): Promise<void> {
  const args = parseArgv(argv.slice(2));
  const [command, keyword] = args._;
  if (!command || command === 'help' || !keyword) {
    console.log(`Forge Runner

Usage:
  node forge/cli/forge-run.ts run <keyword> [--args '<json>'] [--model <name>] [--temperature 0.2] [--maxTokens 1200]
  Env: OPENAI_API_KEY | OPENROUTER_API_KEY | OLLAMA_HOST
`);
    process.exit(0);
  }

  if (command !== 'run') {
    console.error(`Unknown command: ${command}`);
    process.exit(2);
  }

  let parsedArgs: Record<string, unknown> | undefined;
  if (args.args) {
    try {
      parsedArgs = JSON.parse(args.args);
    } catch (error) {
      console.error('Invalid --args JSON:', String(error));
      process.exit(2);
    }
  }

  const result = await executeAndBindWithPrev({
    keyword,
    args: parsedArgs,
    model: args.model,
    temperature: args.temperature ? Number(args.temperature) : undefined,
    maxTokens: args.maxTokens ? Number(args.maxTokens) : undefined,
    actor: args.actor,
    traceId: args.traceId,
    ledgerDir: args.ledgerDir,
  });

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main(process.argv).catch((error) => {
  console.error('forge-run failed:', error);
  process.exit(1);
});
