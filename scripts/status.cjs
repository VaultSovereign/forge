#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function check(name, predicate) {
  const ok = Boolean(predicate());
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  return ok;
}

check('README present', () => exists('README.md'));
check('Vision scroll', () => exists('catalog/tem/vision.yaml'));
check('Sonic scroll', () => exists('catalog/tem/sonic.yaml'));
check('Consciousness template', () => exists('catalog/consciousness/template.yaml'));
check('Output schema', () => exists('schemas/output.schema.json'));
check('Reality ledger bridge', () => exists('reality_ledger/reality_ledger.py'));

const today = new Date().toISOString().slice(0, 10);
const todaysShard = path.join('reality_ledger', `events-${today}.jsonl`);
const legacyShard = path.join('reality_ledger', 'events.jsonl');
check('Reality events (today or legacy)', () => exists(todaysShard) || exists(legacyShard));
