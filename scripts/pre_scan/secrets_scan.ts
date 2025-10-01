#!/usr/bin/env ts-node
import minimist from 'minimist';
import path from 'node:path';
import { preScan } from '../../tools/secrets_prescan.js';

function toArray(input: string | string[] | undefined, fallback: string[]): string[] {
  if (Array.isArray(input)) return input;
  if (!input) return fallback;
  try {
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {}
  return String(input)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

(async () => {
  const argv = minimist(process.argv.slice(2));
  const repositoryPath = path.resolve(String(argv.repo || argv.repository || '.'));
  const fileExtensions = toArray(argv.extensions || argv.ext, ['.env', '.yml', '.yaml', '.json', '.ts', '.js']);
  const sensitivePatterns = toArray(
    argv.patterns || argv.p,
    [
      'OPENAI_API_KEY=sk-[a-zA-Z0-9]{20,}',
      'OPENROUTER_API_KEY=sk-or-[a-zA-Z0-9]{20,}',
      '(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}',
      'AWS_ACCESS_KEY_ID=AKIA[0-9A-Z]{16}',
      'AWS_SECRET_ACCESS_KEY=[A-Za-z0-9/+=]{40}',
      'password=.*'
    ]
  );
  const commitHistoryDepth = Number(argv.depth || argv.commits || 50);
  const excludedNames = toArray(argv.exclude, ['node_modules', 'dist', 'build', '.git', '.next', '.turbo', 'coverage', '.nyc_output']);
  const ignoreExamples = argv.ignore_examples !== undefined ? Boolean(argv.ignore_examples) : true;
  const entropyThreshold = Number(argv.entropy || 4.0);
  const minSecretLength = Number(argv.min || 20);
  const providerHints = toArray(argv.providers, ['openai', 'openrouter', 'github', 'aws']);

  const findings = await preScan({
    repositoryPath,
    fileExtensions,
    sensitivePatterns,
    commitHistoryDepth,
    excludedNames,
    ignoreExamples,
    entropyThreshold,
    minSecretLength,
    providerHints
  });

  process.stdout.write(
    JSON.stringify({ tool: 'forge-secrets-prescan', findings }, null, 2) + '\n'
  );
})().catch((error) => {
  console.error('[pre_scan:secrets] error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
