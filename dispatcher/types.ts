export interface TemplateInputSpec {
  type: 'string' | 'enum';
  required?: boolean;
  values?: string[];
  default?: unknown;
}

export interface Template {
  id: string;
  version: string;
  keyword: string;
  title: string;
  purpose: string;
  inputs: Record<string, TemplateInputSpec>;
  quality_checklist?: string[];
  safety_guardrails?: string[];
  prompt: { system: string; user: string };
  outputs: { schema_ref: string };
}

export interface Profile {
  voice?: string;
  defaults?: Record<string, unknown>;
  style?: Record<string, unknown>;
}

export interface RunArgs {
  [k: string]: unknown;
  brief?: string;
  output_format?: 'json' | 'yaml' | 'markdown';
  scope?: string;
  lab?: boolean;
  variant?: string;
  model?: string;
}

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E = Error>(error: E): Result<never, E> {
  return { ok: false, error };
}

export class RetriableError extends Error {
  constructor(message: string, public readonly code: string = 'RETRIABLE') {
    super(message);
    this.name = 'RetriableError';
  }
}

export interface ProviderCall {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface Provider {
  name: string;
  call(input: ProviderCall): Promise<string>;
  healthy?(): boolean;
}
