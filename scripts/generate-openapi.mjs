#!/usr/bin/env node
// Lightweight OpenAPI generator for the Workbench BFF.
// No external conversion libs; define schemas aligned with Zod route contracts.
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const root = process.cwd();
const outDir = path.resolve(root, 'docs', 'openapi');
mkdirSync(outDir, { recursive: true });

const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'VaultMesh Workbench BFF',
    version: '0.1.0',
    description: 'API surface for templates, execution, ledger, and health.',
  },
  servers: [{ url: 'http://localhost:8787', description: 'local dev' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      TemplateMeta: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          version: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          updatedAt: { type: 'string', description: 'ISO timestamp' },
        },
        required: ['id'],
      },
      TemplateArray: {
        type: 'array',
        items: { $ref: '#/components/schemas/TemplateMeta' },
      },
      TemplateCount: {
        type: 'object',
        properties: { total: { type: 'number' } },
        required: ['total'],
      },
      ExecuteRequest: {
        type: 'object',
        properties: {
          templateId: { type: 'string' },
          profile: { type: 'string', default: 'vault' },
          args: { type: 'object', additionalProperties: true, default: {} },
        },
        required: ['templateId'],
      },
      ExecuteResponse: {
        type: 'object',
        properties: {
          eventId: { type: 'string' },
          status: { type: 'string' },
          output: { type: 'object' },
          error: { type: 'string' },
        },
      },
      LedgerRows: {
        type: 'object',
        properties: {
          total: { type: 'number' },
          rows: { type: 'array', items: { type: 'object' } },
        },
        required: ['total', 'rows'],
      },
      GuardianAskRequest: {
        type: 'object',
        properties: { input: { type: 'string' } },
        required: ['input'],
      },
      GuardianAskResponse: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          events: { type: 'array', items: { type: 'object' } },
          mode: { type: 'string', enum: ['stub', 'agent', 'unknown'] },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          service: { type: 'string' },
          mode: { type: 'string' },
          ts: { type: 'number' },
          version: { type: 'string' },
        },
        required: ['ok'],
      },
    },
  },
  paths: {
    '/v1/health': {
      get: {
        summary: 'Liveness/readiness',
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } },
            },
          },
        },
      },
    },
    '/v1/api/health': {
      get: {
        summary: 'API health',
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                    ts: { type: 'string' },
                    version: { type: 'string' },
                  },
                  required: ['ok'],
                },
              },
            },
          },
        },
      },
    },
    '/v1/api/health/deep': {
      get: {
        summary: 'Deep health incl. core reachability',
        responses: {
          200: {
            description: 'Probe result',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
    '/v1/api/templates': {
      get: {
        summary: 'List templates',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'cursor', in: 'query', schema: { type: 'string' } },
          { name: 'filter', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'List',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/TemplateArray' } },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/v1/api/templates/count': {
      get: {
        summary: 'Count templates',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'filter', in: 'query', schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Count',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/TemplateCount' } },
            },
          },
        },
      },
    },
    '/v1/api/ledger/events': {
      get: {
        summary: 'Query ledger events',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'template', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1 } },
        ],
        responses: {
          200: {
            description: 'Events',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/LedgerRows' } },
            },
          },
        },
      },
    },
    '/v1/api/execute': {
      post: {
        summary: 'Execute a template',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ExecuteRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Execution result',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ExecuteResponse' } },
            },
          },
          403: { description: 'Forbidden' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/v1/api/execute/stream': {
      get: {
        summary: 'Execute with Server-Sent Events',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'templateId', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'profile', in: 'query', schema: { type: 'string', default: 'vault' } },
          {
            name: 'args',
            in: 'query',
            schema: { type: 'string', description: 'JSON-encoded args' },
          },
        ],
        responses: {
          200: {
            description: 'SSE stream',
            content: { 'text/event-stream': { schema: { type: 'string' } } },
          },
        },
      },
    },
    '/guardian/ask': {
      post: {
        summary: 'Ask Guardian (agent/stub)',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/GuardianAskRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Response',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/GuardianAskResponse' } },
            },
          },
        },
      },
    },
    '/v1/guardian/mode': {
      get: {
        summary: 'Guardian mode probe',
        responses: {
          200: {
            description: 'Mode',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    mode: { type: 'string', enum: ['stub', 'agent', 'unknown'] },
                    ts: { type: 'number' },
                  },
                  required: ['mode'],
                },
              },
            },
          },
        },
      },
    },
  },
};

const jsonPath = path.join(outDir, 'workbench.json');
const yamlPath = path.join(outDir, 'workbench.yaml');

writeFileSync(jsonPath, JSON.stringify(openapi, null, 2));
writeFileSync(yamlPath, YAML.stringify(openapi));

console.log(`[openapi] Wrote ${yamlPath} and ${jsonPath}`);
