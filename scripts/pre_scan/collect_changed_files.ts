#!/usr/bin/env ts-node
import { execSync } from 'node:child_process';

function sh(cmd: string): string {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

const base = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : '';
const head = process.env.GITHUB_SHA || 'HEAD';
let files = '';

if (base) {
  sh('git fetch origin +refs/heads/*:refs/remotes/origin/*');
  files = sh(`git diff --name-only ${base}...${head}`);
} else {
  files = sh('git ls-files');
}

const list = files.split('\n').filter(Boolean);
const payload = { changed_only: Boolean(base), files: list };
process.stdout.write(JSON.stringify(payload, null, 2) + '\n');

