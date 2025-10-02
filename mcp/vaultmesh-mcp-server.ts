#!/usr/bin/env node
/**
 * VaultMesh MCP Server
 * Provides template execution, ledger queries, and metadata tools to Claude Code
 */

import path from 'path';
import { fileURLToPath } from 'url';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Dynamic imports to avoid provider initialization issues
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const server = new Server(
  {
    name: 'vaultmesh',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const RunTemplateArgs = z.object({
  template: z.string().min(1),
  profile: z.string().default('vault'),
  args: z.record(z.unknown()).default({}),
  format: z.enum(['markdown', 'json', 'yaml']).default('markdown'),
});

const RenderReportArgs = z.object({
  template: z.string().min(1),
  eventId: z.string().min(1).optional(),
});

const AnalyzeThreatIntelArgs = z.object({
  topic: z.string().min(1),
  sources: z.array(z.string()).optional(),
  scope: z.string().optional(),
});

/**
 * List available templates
 */
async function listTemplates() {
  try {
    const { promises: fs } = await import('fs');
    const path = await import('path');

    const catalogPath = path.resolve(projectRoot, 'catalog');
    const templates: Array<{
      id: string;
      category: string;
      title: string;
      purpose: string;
      version: string;
    }> = [];

    // Read catalog structure
    const categories = await fs.readdir(catalogPath);

    for (const category of categories) {
      const categoryPath = path.join(catalogPath, category);
      const stat = await fs.stat(categoryPath);

      if (stat.isDirectory()) {
        const files = await fs.readdir(categoryPath);

        for (const file of files) {
          if (file.endsWith('.yaml') || file.endsWith('.yml')) {
            try {
              const filePath = path.join(categoryPath, file);
              const content = await fs.readFile(filePath, 'utf8');
              const yaml = await import('yaml');
              const template = yaml.parse(content);

              if (template.keyword) {
                templates.push({
                  id: template.keyword,
                  category,
                  title: template.title || template.keyword,
                  purpose: template.purpose || 'No description',
                  version: template.version || '1.0.0',
                });
              }
            } catch (err) {
              console.error(
                `[mcp] Error reading template ${file}:`,
                err instanceof Error ? err.message : err
              );
            }
          }
        }
      }
    }

    return templates;
  } catch (error) {
    console.error(
      '[mcp] Error listing templates:',
      error instanceof Error ? error.message : String(error)
    );
    return [];
  }
}

/**
 * Run template with given parameters
 */
async function runTemplate(
  templateId: string,
  profile: string = 'vault',
  args: any = {},
  format: string = 'markdown'
) {
  try {
    // Dynamic import to avoid provider initialization
    const { runKeyword } = await import('../dispatcher/router.js');
    const { appendEvent } = await import('../reality_ledger/node.js');

    console.error(`[mcp] Running template: ${templateId} with profile: @${profile}`);

    const result = await runKeyword({
      projectRoot,
      keyword: templateId,
      profileName: profile,
      flags: {
        output_format: format,
        ...args,
      },
    });

    // Log to Reality Ledger
    const eventId = await appendEvent({
      template: templateId,
      profile: `@${profile}`,
      args,
      result,
      operator: 'mcp',
    });

    return {
      eventId,
      result,
      template: templateId,
      profile: `@${profile}`,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(
      `[mcp] Error running template:`,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

/**
 * Query Reality Ledger
 */
async function queryLedger(filters: any = {}) {
  try {
    const { queryLedger, getLedgerStats } = await import('../reality_ledger/node.js');

    if (filters.stats) {
      return await getLedgerStats();
    }

    const events = await queryLedger({
      template: filters.template,
      profile: filters.profile,
      since: filters.since,
      limit: filters.limit || 10,
    });

    return {
      query: filters,
      results: events.length,
      events,
    };
  } catch (error) {
    console.error(
      `[mcp] Error querying ledger:`,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

/**
 * Generate compliance report
 */
async function renderReport(templateId: string, eventId?: string) {
  try {
    const { queryLedger, getEvent } = await import('../reality_ledger/node.js');

    if (eventId) {
      // Render report for specific event
      const event = await getEvent(eventId);
      if (!event) {
        throw new Error(`Event not found: ${eventId}`);
      }

      return {
        type: 'single_event',
        eventId,
        template: event.template,
        timestamp: event.ts,
        report: event.output,
      };
    } else {
      // Render aggregate report for template
      const events = await queryLedger({
        template: templateId,
        limit: 10,
      });

      return {
        type: 'aggregate',
        template: templateId,
        eventCount: events.length,
        reports: events.map((e) => ({
          eventId: e.id,
          timestamp: e.ts,
          summary:
            typeof e.output === 'string' ? e.output.substring(0, 200) + '...' : 'Binary output',
        })),
      };
    }
  } catch (error) {
    console.error(
      `[mcp] Error rendering report:`,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_templates',
      description: 'List all available VaultMesh templates',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: 'run_template',
      description: 'Execute a VaultMesh template',
      inputSchema: {
        type: 'object',
        properties: {
          template: {
            type: 'string',
            description: 'Template ID (e.g., tem-recon, deck-fintech)',
          },
          profile: {
            type: 'string',
            description: 'Profile to use (vault, blue, exec)',
            default: 'vault',
          },
          args: {
            type: 'object',
            description: 'Template arguments as JSON object',
            default: {},
          },
          format: {
            type: 'string',
            description: 'Output format (json, yaml, markdown)',
            enum: ['json', 'yaml', 'markdown'],
            default: 'markdown',
          },
        },
        required: ['template'],
        additionalProperties: false,
      },
    },
    {
      name: 'health',
      description: 'Version and health information for the MCP server',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: 'ledger_query',
      description: 'Query VaultMesh Reality Ledger for audit trail',
      inputSchema: {
        type: 'object',
        properties: {
          template: { type: 'string', description: 'Filter by template ID' },
          profile: { type: 'string', description: 'Filter by profile' },
          since: { type: 'string', description: 'Filter events since timestamp (ISO 8601)' },
          limit: { type: 'number', description: 'Maximum events to return', default: 10 },
          stats: { type: 'boolean', description: 'Return ledger statistics', default: false },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'render_report',
      description: 'Render compliance report from ledger events',
      inputSchema: {
        type: 'object',
        properties: {
          template: { type: 'string', description: 'Template ID for aggregate report' },
          eventId: { type: 'string', description: 'Specific event ID for single report' },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'analyze_threat_intel',
      description: 'Analyze threat intel and produce an executive-ready summary',
      inputSchema: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'Topic to analyze' },
          sources: {
            type: 'array',
            description: 'List of sources (strings, links, or file refs)',
            items: { type: 'string' },
          },
          scope: {
            type: 'string',
            description: 'Summary scope (concise|executive|expanded)',
            default: 'executive',
          },
        },
        required: ['topic'],
        additionalProperties: false,
      },
    },
  ],
}));

// Tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_templates': {
        const templates = await listTemplates();
        return {
          content: [
            {
              type: 'text',
              text: `# VaultMesh Templates\n\n${templates
                .map((t) => `- **${t.id}** (${t.category}): ${t.purpose}`)
                .join('\n')}\n\n**Total**: ${templates.length} templates available`,
            },
          ],
        };
      }

      case 'run_template': {
        const { template, profile, args: templateArgs, format } = RunTemplateArgs.parse(args ?? {});
        const result = await runTemplate(template, profile, templateArgs, format);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      }

      case 'health': {
        const templates = await listTemplates();
        const ledgerPath = path.resolve(projectRoot, 'reality_ledger');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                name: 'vaultmesh',
                version: '1.0.0',
                time: new Date().toISOString(),
                templates: templates.length,
                ledgerPath,
              }),
            },
          ],
        };
      }

      case 'ledger_query': {
        const queryResult = await queryLedger(args);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(queryResult, null, 2),
            },
          ],
        };
      }

      case 'render_report': {
        const { template, eventId } = RenderReportArgs.parse(args ?? {});
        const report = await renderReport(template, eventId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(report),
            },
          ],
        };
      }

      case 'analyze_threat_intel': {
        const { topic, sources, scope } = AnalyzeThreatIntelArgs.parse(args ?? {});
        const result = await runTemplate('operations-research-analyst', 'analyst', {
          topic,
          sources,
          scope: scope || 'executive',
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[mcp] VaultMesh MCP server started');
}

main().catch(console.error);
