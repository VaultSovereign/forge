#!/usr/bin/env -S node --loader ts-node/esm
/**
 * Forge CLI utility commands (additive, opt-in).
 */

import path from 'node:path';
import { spawn } from 'node:child_process';

import { buildLedgerIndex } from '../reality_ledger/indexer.js';

async function main(argv: string[]) {
  const cmd = argv[2] ?? 'help';
  switch (cmd) {
    case 'index-ledger': {
      const dir = argv[3] ? path.resolve(argv[3]) : path.resolve('ledger');
      const index = await buildLedgerIndex(dir);
      console.log(
        JSON.stringify(
          {
            ok: true,
            wrote: path.join(dir, 'index.json'),
            types: Object.keys(index.byType),
          },
          null,
          2
        )
      );
      break;
    }
    case 'validate-templates': {
      const script = path.resolve(process.cwd(), 'scripts/validate-templates.mjs');
      await exec('node', [script], { stdio: 'inherit' });
      break;
    }
    case 'witness': {
      const script = path.resolve(process.cwd(), 'scripts/witness.v2.js');
      await exec('node', [script], { stdio: 'inherit' });
      break;
    }
    case 'rollup': {
      const script = path.resolve(process.cwd(), 'scripts/rollup.v2.sh');
      await exec('bash', [script], { stdio: 'inherit' });
      break;
    }
    case 'verify-ledger': {
      const dir = argv[3] ? path.resolve(argv[3]) : path.resolve('ledger');
      const { verifyLedger } = await import('../reality_ledger/verify.js');
      const result = await verifyLedger(dir);
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
      break;
    }
    default: {
      printHelp();
      process.exit(cmd === 'help' ? 0 : 1);
    }
  }
}

function printHelp() {
  console.log(`Forge CLI

Usage:
  node cli/vm.ts index-ledger [dir]     Build ledger index.json
  node cli/vm.ts validate-templates     Validate catalog templates
  node cli/vm.ts witness                Produce receipts and ROOT.txt
  node cli/vm.ts rollup                 Link LAST_ROOT and daily roots
  node cli/vm.ts verify-ledger [dir]    Verify ledger chain integrity
`);
}

interface ExecOptions {
  stdio?: 'inherit' | 'pipe' | 'ignore';
}

function exec(command: string, args: string[], options: ExecOptions) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { ...options, shell: false });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with ${code}`));
      }
    });
    child.on('error', reject);
  });
}

main(process.argv).catch((error) => {
  console.error(error);
  process.exit(1);
});
