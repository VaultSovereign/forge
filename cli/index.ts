#!/usr/bin/env node
/**
 * VaultMesh CLI - vm command
 * Execute templates, verify ledger events, query audit trail
 */

import { promises as fs, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yargs, { Argv } from 'yargs';
import { hideBin } from 'yargs/helpers';

// Note: Only import runKeyword when needed to avoid provider initialization
// import { runKeyword } from '../dispatcher/router.js';
async function getLedger() {
  try {
    return await import('../reality_ledger/node.js');
  } catch {
    return await import('../reality_ledger/node');
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

interface RunArgs {
  template: string;
  profile?: string;
  args?: string;
  format?: string;
}

interface LedgerQueryArgs {
  template?: string;
  profile?: string;
  since?: string;
  limit?: number;
}

interface DoctorArgs {
  skipProvider?: boolean;
  json?: boolean;
}

interface ScaffoldArgs {
  id: string;
  force?: boolean;
}

type DoctorCheckStatus = 'pass' | 'fail' | 'skip';

interface DoctorCheck {
  name: string;
  status: DoctorCheckStatus;
  detail: string;
}

function toTitleCase(parts: string[]): string {
  return parts
    .map((part) => part.replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()))
    .join(' ')
    .trim();
}

function loadArgs(raw?: string): any {
  if (!raw || !raw.trim()) return {};
  let value = raw.trim();
  if (value.startsWith('@')) {
    const filePath = value.slice(1);
    const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
    value = readFileSync(resolved, 'utf8');
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse --args value: ${reason}`);
  }
}

async function runTemplate(argv: RunArgs): Promise<void> {
  try {
    // Import dynamically to avoid provider initialization issues
    const [{ runKeyword }, { resolveTemplateMeta }] = await Promise.all([
      import('../dispatcher/router.js'),
      import('./templateResolver.js'),
    ]);

    const meta = await resolveTemplateMeta(projectRoot, argv.template);
    const args = loadArgs(argv.args);
    const profile = argv.profile || 'vault';

    console.error(
      `[vm] Running template: ${meta.keyword} (input: ${argv.template}) with profile: @${profile}`
    );

    const result = await runKeyword({
      projectRoot,
      keyword: meta.keyword,
      profileName: profile,
      flags: {
        output_format: argv.format || 'json',
        ...args,
      },
    });

    // Append to Reality Ledger
    const { appendEvent } = await getLedger();
    const eventId = await appendEvent({
      template: argv.template,
      profile: `@${profile}`,
      args,
      result,
      operator: 'cli',
    });

    const output = {
      eventId,
      result: typeof result === 'string' ? result : result,
      template: argv.template,
      profile: `@${profile}`,
      timestamp: new Date().toISOString(),
    };

    console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    console.error(`[vm] Error:`, error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function verifyLedgerEvent(argv: { eventId: string }): Promise<void> {
  try {
    console.error(`[vm] Verifying event: ${argv.eventId}`);

    const { verifyEvent } = await getLedger();
    const isValid = await verifyEvent(argv.eventId);

    if (isValid) {
      console.log('✅ Event verification: PASS');
      console.log(JSON.stringify({ eventId: argv.eventId, verified: true }, null, 2));
    } else {
      console.log('❌ Event verification: FAIL');
      console.log(JSON.stringify({ eventId: argv.eventId, verified: false }, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.error(
      `[vm] Verification error:`,
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

async function queryLedgerEvents(argv: LedgerQueryArgs): Promise<void> {
  try {
    console.error(`[vm] Querying ledger...`);

    const { queryLedger } = await getLedger();
    const events = await queryLedger({
      template: argv.template,
      profile: argv.profile,
      since: argv.since,
      limit: argv.limit || 10,
    });

    console.log(
      JSON.stringify(
        {
          query: {
            template: argv.template,
            profile: argv.profile,
            since: argv.since,
            limit: argv.limit || 10,
          },
          results: events.length,
          events,
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error(`[vm] Query error:`, error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function showLedgerStats(): Promise<void> {
  try {
    console.error(`[vm] Getting ledger statistics...`);

    const { getLedgerStats } = await getLedger();
    const stats = await getLedgerStats();

    console.log(
      JSON.stringify(
        {
          ledger: 'VaultMesh Reality Ledger',
          ...stats,
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error(`[vm] Stats error:`, error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function runDoctor(argv: DoctorArgs): Promise<void> {
  const checks: DoctorCheck[] = [];
  let ok = true;

  const providerEnv = {
    ollama: process.env.OLLAMA_HOST,
    openrouter: process.env.OPENROUTER_API_KEY,
    openai: process.env.OPENAI_API_KEY,
  };

  const configuredProvider = providerEnv.ollama
    ? 'local_ollama'
    : providerEnv.openrouter
      ? 'openrouter'
      : providerEnv.openai
        ? 'openai'
        : null;

  if (configuredProvider) {
    checks.push({
      name: 'provider_env',
      status: 'pass',
      detail: `Detected provider configuration for ${configuredProvider}`,
    });
  } else {
    checks.push({
      name: 'provider_env',
      status: 'fail',
      detail: 'No provider configured. Set OLLAMA_HOST, OPENROUTER_API_KEY, or OPENAI_API_KEY.',
    });
    ok = false;
  }

  if (configuredProvider && !argv.skipProvider) {
    try {
      const { createProviderConfig } = await import('../dispatcher/modelProvider.js');
      const config = createProviderConfig();
      checks.push({
        name: 'provider_config',
        status: 'pass',
        detail: `Resolved provider ${config.provider} with default model ${config.model}`,
      });

      try {
        const probe = await config.chat(
          config.model,
          'You are VaultMesh Forge doctor. Reply with a short affirmation.',
          'Respond with the word OK.'
        );
        const healthy = typeof probe === 'string' && probe.trim().length > 0;
        checks.push({
          name: 'provider_reachability',
          status: healthy ? 'pass' : 'fail',
          detail: healthy
            ? 'Provider responded successfully.'
            : 'Provider returned empty response.',
        });
        if (!healthy) ok = false;
      } catch (error) {
        checks.push({
          name: 'provider_reachability',
          status: 'fail',
          detail: `Provider call failed: ${error instanceof Error ? error.message : String(error)}`,
        });
        ok = false;
      }
    } catch (error) {
      checks.push({
        name: 'provider_config',
        status: 'fail',
        detail: `Provider configuration error: ${error instanceof Error ? error.message : String(error)}`,
      });
      ok = false;
    }
  } else if (argv.skipProvider) {
    checks.push({
      name: 'provider_reachability',
      status: 'skip',
      detail: 'Provider reachability test skipped by flag.',
    });
  }

  const ledgerDir = path.resolve(projectRoot, 'reality_ledger');
  try {
    await fs.mkdir(ledgerDir, { recursive: true });
    const probeFile = path.join(ledgerDir, '.doctor-write-test');
    await fs.writeFile(probeFile, new Date().toISOString(), { encoding: 'utf8', flag: 'w' });
    await fs.rm(probeFile, { force: true });
    checks.push({
      name: 'ledger_write',
      status: 'pass',
      detail: `Write access confirmed for ${ledgerDir}`,
    });
  } catch (error) {
    checks.push({
      name: 'ledger_write',
      status: 'fail',
      detail: `Ledger write check failed: ${error instanceof Error ? error.message : String(error)}`,
    });
    ok = false;
  }

  const report = { ok, checks };
  const payload = argv.json ? JSON.stringify(report) : JSON.stringify(report, null, 2);
  console.log(payload);
  if (!ok) {
    process.exit(1);
  }
}

async function scaffoldTemplate(argv: ScaffoldArgs): Promise<void> {
  const rawId = argv.id?.trim();
  if (!rawId) {
    console.error('[vm] Template ID is required. Example: vm scaffold template tem.new_clause');
    process.exit(1);
  }

  const parts = rawId.split('.').filter(Boolean);
  if (parts.length < 2) {
    console.error('[vm] Template ID must be in the form <family>.<name>');
    process.exit(1);
  }

  const family = parts[0];
  const nameParts = parts.slice(1);
  const keyword = rawId.replace(/\./g, '-');
  const suggestedTitle = toTitleCase(nameParts) || `${toTitleCase([family])} Template`;
  const slug = nameParts.join('-') || 'template';
  const catalogDir = path.join(projectRoot, 'catalog', family);
  const targetPath = path.join(catalogDir, `${slug}.yaml`);

  try {
    await fs.mkdir(catalogDir, { recursive: true });
  } catch (error) {
    console.error(
      `[vm] Failed to ensure catalog directory: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }

  if (!argv.force) {
    try {
      await fs.access(targetPath);
      console.error(
        `[vm] Refusing to overwrite existing file at ${targetPath}. Use --force to override.`
      );
      process.exit(1);
    } catch {
      // File does not exist, proceed
    }
  }

  const schemaPointer = `../schemas/output.schema.json#/definitions/${[family, ...nameParts].join('/')}`;
  const scaffold = `# VaultMesh Template Scaffold
# Fill in purpose, enums, prompts, and schema details before using in production.

id: ${rawId}
version: 0.1.0
keyword: ${keyword}
title: ${suggestedTitle}
purpose: TODO: Describe the goal of this template.
inputs:
  subject: {type: string, required: true}
  output_format: {type: enum, values: [json, yaml, markdown], default: markdown}
quality_checklist:
  - "Define success criteria for the output"
  - "List mandatory guardrails"
safety_guardrails:
  - "Document safety boundaries for this template"
prompt:
  system: |
    You are the orchestrator for ${suggestedTitle}. Maintain VaultMesh controls and tone.
  user: |
    {{profile.voice}}

    Purpose: {{purpose}}
    Subject: {{subject}}
    Output format: {{output_format}}

    Quality Requirements:
      {{#each quality_checklist}}- {{this}}
      {{/each}}

    If output_format=json, respond in **strict JSON** that conforms to ${schemaPointer}.
outputs:
  schema_ref: "${schemaPointer}"
`;

  try {
    await fs.writeFile(targetPath, scaffold, 'utf8');
    console.log(
      JSON.stringify({ created: targetPath, id: rawId, keyword, schema: schemaPointer }, null, 2)
    );
  } catch (error) {
    console.error(
      `[vm] Failed to write scaffold: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}
// CLI Definition
yargs(hideBin(process.argv))
  .scriptName('vm')
  .usage('$0 <command> [options]')
  .command(
    'run <template>',
    'Execute a template with optional profile and arguments',
    (yargs: Argv) => {
      return yargs
        .positional('template', {
          describe: 'Template identifier (e.g., tem-recon, dora.ict_risk)',
          type: 'string',
          demandOption: true,
        })
        .option('profile', {
          alias: 'p',
          describe: 'Profile to use (vault, blue, exec)',
          type: 'string',
          default: 'vault',
        })
        .option('args', {
          alias: 'a',
          describe: 'JSON arguments for template',
          type: 'string',
          default: '{}',
        })
        .option('format', {
          alias: 'f',
          describe: 'Output format',
          choices: ['json', 'yaml', 'markdown'],
          default: 'json',
        });
    },
    runTemplate
  )
  .command(
    'ledger verify <eventId>',
    'Verify a ledger event by recomputing its hash',
    (yargs: Argv) => {
      return yargs.positional('eventId', {
        describe: 'Event ID to verify',
        type: 'string',
        demandOption: true,
      });
    },
    verifyLedgerEvent
  )
  .command(
    'ledger query',
    'Query ledger events with optional filters',
    (yargs: Argv) => {
      return yargs
        .option('template', {
          describe: 'Filter by template ID',
          type: 'string',
        })
        .option('profile', {
          describe: 'Filter by profile',
          type: 'string',
        })
        .option('since', {
          describe: 'Filter events since timestamp (ISO 8601)',
          type: 'string',
        })
        .option('limit', {
          describe: 'Maximum number of events to return',
          type: 'number',
          default: 10,
        });
    },
    queryLedgerEvents
  )
  .command('ledger stats', 'Show ledger statistics', () => {}, showLedgerStats)
  .command(
    'doctor',
    'Run environment diagnostics for VaultMesh Forge',
    (yargs: Argv) =>
      yargs
        .option('skip-provider', {
          describe: 'Skip live provider reachability probe',
          type: 'boolean',
          default: false,
        })
        .option('json', {
          describe: 'Emit machine-readable JSON only',
          type: 'boolean',
          default: false,
        }),
    (argv) => runDoctor({ skipProvider: Boolean(argv['skip-provider']), json: Boolean(argv.json) })
  )
  .command(
    'scaffold template <id>',
    'Generate a catalog template scaffold',
    (yargs: Argv) =>
      yargs
        .positional('id', {
          describe: 'Template identifier (family.name)',
          type: 'string',
          demandOption: true,
        })
        .option('force', {
          describe: 'Overwrite existing file if present',
          type: 'boolean',
          default: false,
        }),
    (argv) => scaffoldTemplate({ id: String(argv.id), force: Boolean(argv.force) })
  )
  .example(
    '$0 run tem-recon -p blue -a \'{"target":"example.org","depth":"shallow"}\'',
    'Run reconnaissance template'
  )
  .example(
    '$0 run dora.ict_risk -a \'{"org_name":"Acme","critical_functions":["Payments"]}\'',
    'Run DORA ICT Risk template'
  )
  .example('$0 ledger verify a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Verify a specific event')
  .example('$0 ledger query --template tem-recon --limit 5', 'Query recent recon events')
  .demandCommand(1, 'You must specify a command')
  .help()
  .alias('h', 'help')
  .version('1.0.0')
  .alias('v', 'version').argv;
