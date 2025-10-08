#!/usr/bin/env -S node --loader ts-node/esm
/**
 * Execute an incantation (composed ritual) and bind every step into the ledger.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parse } from 'yaml';

import { executeAndBindWithPrev } from '../executor/ledgerBinder.prev.js';

interface CliArgs {
  _: string[];
  dir?: string;
  model?: string;
  ledgerDir?: string;
  actor?: string;
}

interface IncantationStep {
  template: string;
  args?: Record<string, unknown>;
  model?: string;
}

interface IncantationDoc {
  id: string;
  keyword: string;
  title?: string;
  steps: IncantationStep[];
  runlevel?: string;
}

function parseArgv(argv: string[]): CliArgs {
  const out: CliArgs = { _: [] };
  const iterator = argv[Symbol.iterator]();
  for (const token of iterator) {
    if (!token.startsWith('--')) {
      out._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = iterator.next();
    const value = next.done ? undefined : next.value;
    (out as unknown as Record<string, string | undefined>)[key] = value;
  }
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function discoverIncantationFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  await Promise.all(
    entries.map(async (entry) => {
      const resolved = path.join(root, entry.name);
      if (entry.isDirectory()) {
        const nested = await discoverIncantationFiles(resolved);
        files.push(...nested);
      } else if (entry.isFile() && /\.(ya?ml)$/i.test(entry.name)) {
        files.push(resolved);
      }
    }),
  );
  files.sort();
  return files;
}

async function loadIncantation(file: string): Promise<IncantationDoc | null> {
  try {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = parse(raw);
    if (!isRecord(parsed)) {
      return null;
    }
    const keyword = typeof parsed.keyword === 'string' ? parsed.keyword.trim() : '';
    const id = typeof parsed.id === 'string' ? parsed.id.trim() : keyword;
    const stepsRaw = Array.isArray(parsed.steps) ? parsed.steps : [];
    const steps: IncantationStep[] = [];
    for (const candidate of stepsRaw) {
      if (!isRecord(candidate) || typeof candidate.template !== 'string') {
        continue;
      }
      const normalized: IncantationStep = { template: candidate.template };
      if (isRecord(candidate.args)) {
        normalized.args = candidate.args as Record<string, unknown>;
      }
      if (typeof candidate.model === 'string') {
        normalized.model = candidate.model;
      }
      steps.push(normalized);
    }

    if (!keyword || steps.length === 0) {
      return null;
    }

    return {
      id: id || keyword,
      keyword,
      title: typeof parsed.title === 'string' ? parsed.title : undefined,
      steps,
      runlevel: typeof parsed.runlevel === 'string' ? parsed.runlevel : undefined,
    };
  } catch {
    return null;
  }
}

async function listIncantations(dir: string): Promise<IncantationDoc[]> {
  const files = await discoverIncantationFiles(dir);
  const docs: IncantationDoc[] = [];
  for (const file of files) {
    const doc = await loadIncantation(file);
    if (doc) {
      docs.push(doc);
    }
  }
  docs.sort((a, b) => a.keyword.localeCompare(b.keyword));
  return docs;
}

async function findIncantation(keyword: string, dir: string): Promise<IncantationDoc | null> {
  const docs = await listIncantations(dir);
  return docs.find((doc) => doc.keyword === keyword) ?? null;
}

async function runIncantation(keyword: string, options: CliArgs): Promise<void> {
  const incantationDir = options.dir ? path.resolve(options.dir) : path.resolve('forge/incantations');
  const doc = await findIncantation(keyword, incantationDir);
  if (!doc) {
    console.error(`Unknown incantation: ${keyword}`);
    process.exit(2);
  }

  const actor = options.actor ?? `incantation:${doc.keyword}`;
  const traceId = crypto.randomUUID();
  const baseModel = options.model ?? process.env.FORGE_MODEL ?? undefined;

  const summary: Array<Record<string, unknown>> = [];
  for (let index = 0; index < doc.steps.length; index += 1) {
    const step = doc.steps[index];
    const result = await executeAndBindWithPrev({
      keyword: step.template,
      args: step.args,
      model: step.model ?? baseModel,
      actor,
      traceId,
      ledgerDir: options.ledgerDir,
    });

    summary.push({
      index,
      template: step.template,
      ok: result.ok,
      hash: result.hash,
      file: result.file,
      day: result.day,
    });

    if (!result.ok) {
      console.error(
        JSON.stringify(
          {
            ok: false,
            keyword: doc.keyword,
            index,
            template: step.template,
            error: result.error ?? 'execution_failed',
          },
          null,
          2,
        ),
      );
      process.exit(1);
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        keyword: doc.keyword,
        id: doc.id,
        title: doc.title,
        runlevel: doc.runlevel,
        actor,
        traceId,
        steps: summary,
      },
      null,
      2,
    ),
  );
}

async function main(argv: string[]): Promise<void> {
  const args = parseArgv(argv.slice(2));
  const [command, keyword] = args._;

  if (!command || command === 'help') {
    console.log(`Incantations

Usage:
  node forge/cli/incantation-run.ts list [--dir <path>]
  node forge/cli/incantation-run.ts run <keyword> [--dir <path>] [--model <name>] [--ledgerDir <path>]
`);
    return;
  }

  if (command === 'list') {
    const incantationDir = args.dir ? path.resolve(args.dir) : path.resolve('forge/incantations');
    const docs = await listIncantations(incantationDir);
    console.log(
      JSON.stringify(
        {
          ok: true,
          count: docs.length,
          incantations: docs.map((doc) => ({ keyword: doc.keyword, id: doc.id, title: doc.title, runlevel: doc.runlevel })),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (command === 'run') {
    if (!keyword) {
      console.error('Usage: incantation-run.ts run <keyword>');
      process.exit(2);
    }
    await runIncantation(keyword, args);
    return;
  }

  console.error(`Unknown command: ${command}`);
  process.exit(2);
}

main(process.argv).catch((error) => {
  console.error('incantation-run failed:', error);
  process.exit(1);
});
