import { promises as fs } from 'node:fs';
import path from 'node:path';

import { getLogger } from '../lib/logger.js';
import { ProviderManager } from './providerFallback.js';
import type { Provider } from './types.js';
import { OpenAIProvider } from '../providers/openai.js';
import { OpenRouterProvider } from '../providers/openrouter.js';
import { OllamaProvider } from '../providers/ollama.js';

export interface ExecOptions {
  keyword: string;
  args?: Record<string, unknown>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ExecResult {
  ok: boolean;
  output?: string;
  templateId?: string;
  meta?: Record<string, unknown>;
  error?: string;
}

interface TemplateHit {
  id: string;
  path: string;
  doc: any;
}

async function parseYaml(text: string): Promise<any> {
  try {
    const mod: any = await import('yaml');
    const parser = mod?.default?.parse ?? mod?.parse;
    if (typeof parser !== 'function') {
      throw new Error('yaml parse function missing');
    }
    return parser(text);
  } catch (error) {
    throw new Error(`yaml_parse_failed: ${String(error)}`);
  }
}

async function walk(dir: string, acc: string[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(absolute, acc);
    } else if (absolute.endsWith('.yaml') || absolute.endsWith('.yml')) {
      acc.push(absolute);
    }
  }
}

export class TemplateExecutor {
  private readonly log = getLogger({ module: 'template-executor' });
  private readonly manager: ProviderManager;

  constructor(manager?: ProviderManager) {
    this.manager = manager ?? new ProviderManager({ baseTimeoutMs: 60_000 });
    if (!manager) {
      this.bootstrapDefaultProviders();
    }
  }

  private bootstrapDefaultProviders() {
    const chain: Array<{ provider: Provider; weight: number }> = [
      { provider: new OpenAIProvider(), weight: 3 },
      { provider: new OpenRouterProvider(), weight: 2 },
      { provider: new OllamaProvider(), weight: 1 },
    ];

    for (const { provider, weight } of chain) {
      try {
        this.manager.register(provider, weight);
      } catch (error) {
        this.log.warn({ provider: provider.name, err: String(error) }, 'failed to register provider');
      }
    }
  }

  async listTemplates(root = 'catalog'): Promise<string[]> {
    const resolved = path.resolve(root);
    const files: string[] = [];
    await walk(resolved, files);
    files.sort();
    return files;
  }

  async resolveTemplateByKeyword(keyword: string, root = 'catalog'): Promise<TemplateHit | null> {
    const files = await this.listTemplates(root);
    for (const file of files) {
      try {
        const raw = await fs.readFile(file, 'utf8');
        const doc = await parseYaml(raw);
        if (String(doc?.keyword ?? '') === keyword) {
          return { id: String(doc?.id ?? keyword), path: file, doc };
        }
      } catch (error) {
        this.log.warn({ file, err: String(error) }, 'failed to parse template while resolving');
      }
    }
    return null;
  }

  async exec(options: ExecOptions): Promise<ExecResult> {
    const keyword = options.keyword.trim();
    if (!keyword) {
      return { ok: false, error: 'template_keyword_required' };
    }

    const hit = await this.resolveTemplateByKeyword(keyword);
    if (!hit) {
      return { ok: false, error: `template_not_found:${keyword}` };
    }

    const systemPrompt = String(hit.doc?.prompts?.system ?? 'You are Forge.');
    const userTemplate = String(hit.doc?.prompts?.user ?? '');
    const renderedUser = renderTemplate(userTemplate, options.args ?? {});

    const result = await this.manager.call({
      model: options.model ?? 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: renderedUser },
      ],
      temperature: options.temperature ?? 0.2,
      maxTokens: options.maxTokens ?? 1_200,
    });

    if (!result.ok) {
      return { ok: false, error: String(result.error) };
    }

    this.log.info(
      { keyword, providerChain: 'default', templateId: hit.id },
      'template execution succeeded',
    );

    return {
      ok: true,
      output: result.value,
      templateId: hit.id,
      meta: { path: hit.path },
    };
  }
}

function renderTemplate(source: string, args: Record<string, unknown>): string {
  return source.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    const value = args[key];
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  });
}
