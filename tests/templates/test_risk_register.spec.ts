import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import YAML from 'yaml';

describe('operations-risk-register template + schema', () => {
  const projectRoot = path.resolve(__dirname, '..', '..');

  it('schema validates a representative report', async () => {
    const schemaPath = path.join(projectRoot, 'schemas', 'output.schema.json');
    const raw = await fs.readFile(schemaPath, 'utf8');
    const json = JSON.parse(raw) as Record<string, unknown>;
    const schema = (json?.definitions as any)?.operations?.risk_register_report;
    expect(schema, 'schema definition exists').toBeTruthy();

    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv); // enables date-time, uri, etc.
    const validate = ajv.compile(schema);

    const sample = {
      generated_at: new Date(0).toISOString(),
      scope: 'org',
      summary: 'Overall medium risk posture with prioritized mitigations.',
      risks: [
        {
          id: 'R-1',
          title: 'Vendor data handling gaps',
          owner: 'RiskOps',
          likelihood: 3,
          impact: 4,
          controls: ['Vendor due diligence', 'DPoA review scheduled'],
          next_action: 'Finalize remediation plan and assign engineering owner',
          notes: 'Focus on high-usage vendors first',
        },
      ],
    };

    const ok = validate(sample);
    if (!ok) {
      console.error(validate.errors);
    }
    expect(ok).toBe(true);
  });

  it('template is present and wired to schema', async () => {
    const tplPath = path.join(projectRoot, 'catalog', 'operations', 'risk_register.yaml');
    const raw = await fs.readFile(tplPath, 'utf8');
    const tpl = YAML.parse(raw) as Record<string, any>;
    expect(tpl.keyword).toBe('operations-risk-register');
    expect(tpl.outputs?.schema_ref).toBe(
      '../schemas/output.schema.json#/definitions/operations/risk_register_report'
    );
    expect(typeof tpl.prompt?.system).toBe('string');
    expect(typeof tpl.prompt?.user).toBe('string');
  });
});
