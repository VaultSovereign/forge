#!/usr/bin/env ts-node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

function tryTrivy(image: string): unknown {
  try {
    const out = execFileSync('trivy', ['image', '--quiet', '--format', 'json', image], {
      encoding: 'utf8',
    });
    return JSON.parse(out);
  } catch {
    return null;
  }
}

const DOCKERFILE = process.env.DOCKERFILE || 'Dockerfile';
const IMAGE = process.env.IMAGE || 'ghcr.io/vaultsovereign/forge:ci';

let dockerfileText = '';
try {
  dockerfileText = fs.readFileSync(DOCKERFILE, 'utf8');
} catch {
  // Dockerfile absent; emit empty string in report
}

const trivy = tryTrivy(IMAGE);
process.stdout.write(
  JSON.stringify(
    { dockerfile_path: DOCKERFILE, dockerfile_text: dockerfileText, trivy_report: trivy },
    null,
    2
  ) + '\n'
);
