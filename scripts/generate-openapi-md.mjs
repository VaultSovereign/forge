#!/usr/bin/env node
/**
 * Generate docs/OPENAPI.md from an OpenAPI (YAML/JSON) spec.
 * Usage:
 *   node scripts/generate-openapi-md.mjs docs/openapi/workbench.yaml docs/OPENAPI.md
 *
 * No deps beyond 'yaml' (which you already use).
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

let Yaml;
try {
  Yaml = (await import('yaml')).default;
} catch {
  console.error("Missing dependency 'yaml'. Install with: pnpm -w add -D yaml");
  process.exit(1);
}

// ---- helpers ---------------------------------------------------------------

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];
const METHOD_ORDER = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD', 'TRACE'];
const PREFERRED_MEDIA = [
  'application/json',
  'multipart/form-data',
  'application/x-www-form-urlencoded',
  'text/plain',
  '*/*',
];

function loadSpec(p) {
  const raw = fs.readFileSync(p, 'utf8');
  if (p.endsWith('.yaml') || p.endsWith('.yml')) return Yaml.parse(raw);
  return JSON.parse(raw);
}

function mdEscape(s = '') {
  return String(s)
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function shortSchemaName(s) {
  if (!s) return '';
  const m = String(s).match(/#\/components\/schemas\/(.+)$/);
  return m ? m[1] : s;
}

function typeName(schema) {
  if (!schema) return '';
  if (schema.$ref) return shortSchemaName(schema.$ref);

  // composed types
  if (Array.isArray(schema.oneOf) && schema.oneOf.length) {
    return 'oneOf(' + schema.oneOf.map(typeName).join('|') + ')';
  }
  if (Array.isArray(schema.anyOf) && schema.anyOf.length) {
    return 'anyOf(' + schema.anyOf.map(typeName).join('|') + ')';
  }
  if (Array.isArray(schema.allOf) && schema.allOf.length) {
    return 'allOf(' + schema.allOf.map(typeName).join('+') + ')';
  }

  // arrays
  if (schema.type === 'array') {
    return 'array[' + typeName(schema.items) + ']';
  }

  // enums
  if (Array.isArray(schema.enum) && schema.enum.length) {
    const preview = schema.enum.slice(0, 3).join('|') + (schema.enum.length > 3 ? '|…' : '');
    return (schema.type ? schema.type + ' ' : '') + 'enum(' + preview + ')';
  }

  return schema.type || '';
}

function pickMedia(content = {}) {
  const keys = Object.keys(content);
  if (!keys.length) return '';
  for (const pref of PREFERRED_MEDIA) {
    const hit = keys.find((k) => k === pref || k.includes(pref));
    if (hit) return hit;
  }
  return keys[0];
}

function preferCode(responses = {}) {
  const codes = Object.keys(responses);
  const preferred = ['200', '201', '202', '204'];
  for (const c of preferred) if (responses[c]) return c;

  const twos = codes.filter((c) => /^[12]\d\d$/.test(c)).sort((a, b) => Number(a) - Number(b));
  if (twos.length) return twos[0];
  if ('default' in responses) return 'default';
  return codes.sort()[0] || '';
}

function joinSecurity(secArr) {
  if (!Array.isArray(secArr) || !secArr.length) return '';
  // Convert [{ bearerAuth: [] }, { oauth2: ['read','write'] }] -> "bearerAuth \| oauth2(read,write)"
  return secArr
    .map((obj) =>
      Object.entries(obj || {})
        .map(([scheme, scopes]) =>
          scopes && scopes.length ? `${scheme}(${scopes.join(',')})` : scheme
        )
        .join('+')
    )
    .join(' \\| ');
}

function renderSecuritySchemes(schemes) {
  if (!schemes || typeof schemes !== 'object') return '';
  const lines = [];
  for (const [k, v] of Object.entries(schemes)) {
    if (!v) continue;
    if (v.type === 'http') {
      lines.push(
        `- **${k}**: http${v.scheme ? ` (${v.scheme})` : ''}${v.bearerFormat ? ` — ${v.bearerFormat}` : ''}`
      );
    } else if (v.type === 'apiKey') {
      lines.push(`- **${k}**: apiKey (in: ${v.in}, name: ${v.name})`);
    } else if (v.type === 'oauth2') {
      const flows = v.flows ? Object.keys(v.flows).join(', ') : '';
      lines.push(`- **${k}**: oauth2${flows ? ` [${flows}]` : ''}`);
    } else {
      lines.push(`- **${k}**: ${v.type}`);
    }
  }
  return lines.join('\n');
}

function collectEndpoints(spec) {
  const rows = [];
  const paths = spec.paths || {};
  for (const route of Object.keys(paths).sort()) {
    const item = paths[route] || {};
    const methods = Object.keys(item)
      .filter((k) => HTTP_METHODS.includes(k.toLowerCase()))
      .map((m) => m.toUpperCase())
      .sort((a, b) => METHOD_ORDER.indexOf(a) - METHOD_ORDER.indexOf(b));

    for (const method of methods) {
      const op = item[method.toLowerCase()] || {};
      const sum = op.summary || op.operationId || '';
      const summary = op.deprecated ? `⚠️ ${sum || 'Deprecated'}` : sum;

      const sec = joinSecurity(op.security ?? spec.security);

      // tiny param summary: qX/pY/hZ
      const params = [...(item.parameters || []), ...(op.parameters || [])];
      const qp = params.filter((p) => (p && (p.in || p.location)) === 'query').length;
      const pp = params.filter((p) => (p && (p.in || p.location)) === 'path').length;
      const hp = params.filter((p) => (p && (p.in || p.location)) === 'header').length;
      const paramSummary = qp || pp || hp ? ` — params q${qp}/p${pp}/h${hp}` : '';

      // request body
      let request = '';
      const rb = op.requestBody;
      if (rb && rb.content) {
        const media = pickMedia(rb.content);
        const schema = rb.content[media]?.schema;
        request = [media, typeName(schema)].filter(Boolean).join(' ');
      }

      // response
      const res = op.responses || {};
      const code = preferCode(res);
      let response = '';
      if (code && res[code] && res[code].content) {
        const rmedia = pickMedia(res[code].content);
        const rsch = res[code].content[rmedia]?.schema;
        response = [code, rmedia, typeName(rsch)].filter(Boolean).join(' ');
      } else if (code) {
        response = code;
      }

      rows.push({
        method,
        route,
        summary: summary + paramSummary,
        security: sec,
        request,
        response,
      });
    }
  }
  return rows;
}

function render(spec) {
  const title = spec.info?.title || 'API';
  const version = spec.info?.version || '';
  const servers =
    Array.isArray(spec.servers) && spec.servers.length
      ? spec.servers.map((s) => s.url).join(', ')
      : '';

  const auth = renderSecuritySchemes(spec.components?.securitySchemes);
  const endpoints = collectEndpoints(spec);
  const now = new Date().toISOString();

  let md = `<!-- ⚠️ AUTO-GENERATED: do not edit. Generated ${now} by scripts/generate-openapi-md.mjs -->\n\n`;
  md += `# ${mdEscape(title)}${version ? ` (v${mdEscape(version)})` : ''}\n\n`;
  if (servers) md += `**Servers:** ${servers}\n\n`;
  if (auth) md += `## Security Schemes\n${auth}\n\n`;

  md += `## Endpoints\n\n`;
  md += `| Method | Path | Summary | Security | Request | Response |\n`;
  md += `|---|---|---|---|---|---|\n`;
  for (const r of endpoints) {
    md += `| ${mdEscape(r.method)} | \`${mdEscape(r.route)}\` | ${mdEscape(
      r.summary
    )} | ${mdEscape(r.security)} | ${mdEscape(r.request)} | ${mdEscape(r.response)} |\n`;
  }

  md += `\n---\n**Notes**\n\n`;
  md += `- All /v1/api/* routes require Bearer JWT in production (see RBAC in \`config/rbac.yaml\`).\n`;
  md += `- In dev, \`AUTH_DEV_BYPASS=1\` disables auth; CI tokened smoke uses a local dev signer + JWKS.\n`;
  md += `- SSE endpoints stream events; use EventSource in the browser or \`curl -N\` for CLI.\n`;

  return md;
}

function main() {
  const [src, out] = process.argv.slice(2);
  if (!src || !out) {
    console.error('Usage: node scripts/generate-openapi-md.mjs <spec.(yaml|json)> <output.md>');
    process.exit(2);
  }
  const spec = loadSpec(path.resolve(src));
  const md = render(spec);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, md, 'utf8');
  console.log(`Wrote ${out}`);
}

main();
