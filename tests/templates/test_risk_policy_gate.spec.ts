import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import YAML from 'yaml';

describe('operations-risk-policy-gate template + schema', () => {
  const projectRoot = path.resolve(__dirname, '..', '..');

  it('schema validates representative gate results', async () => {
    const schemaPath = path.join(projectRoot, 'schemas', 'output.schema.json');
    const raw = await fs.readFile(schemaPath, 'utf8');
    const json = JSON.parse(raw) as Record<string, unknown>;
    const schema = (json?.definitions as any)?.operations?.risk_policy_gate_result;
    expect(schema, 'schema definition exists').toBeTruthy();

    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const validate = ajv.compile(schema);

    const samplePass = { passed: true, violations: [] };
    const sampleFail = {
      passed: false,
      violations: [{ id: 'R-003', title: 'Critical', reason: 'High severity without next_action' }],
    };

    expect(validate(samplePass)).toBe(true);
    expect(validate(sampleFail)).toBe(true);
  });

  it('template is present and wired to schema', async () => {
    const tplPath = path.join(projectRoot, 'catalog', 'operations', 'risk_policy_gate.yaml');
    const raw = await fs.readFile(tplPath, 'utf8');
    const tpl = YAML.parse(raw) as Record<string, any>;
    expect(tpl.keyword).toBe('operations-risk-policy-gate');
    expect(tpl.outputs?.schema_ref).toBe(
      '../schemas/output.schema.json#/definitions/operations/risk_policy_gate_result'
    );
    expect(typeof tpl.prompt?.system).toBe('string');
    expect(typeof tpl.prompt?.user).toBe('string');
  });
});
