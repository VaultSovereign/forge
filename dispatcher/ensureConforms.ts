import { default as Ajv } from 'ajv';
import type { AnySchema, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

export async function ensureConforms(
  raw: string,
  schemaObj: AnySchema
): Promise<{ ok: boolean; value?: unknown; errors?: Array<ErrorObject | { message: string }> }> {
  // Try extracting JSON from raw text
  let candidate: unknown;
  try {
    const jsonBlock = extractJSON(raw);
    candidate = JSON.parse(jsonBlock) as unknown;
  } catch (_e) {
    return { ok: false, errors: [{ message: 'JSON parse failed' }] };
  }

  const validate = ajv.compile(schemaObj);
  const valid = validate(candidate);
  if (valid) return { ok: true, value: candidate };
  return { ok: false, errors: validate.errors || [] };
}

export function extractJSON(text: string): string {
  const fence = /```json\s*([\s\S]*?)```/i;
  const m = text.match(fence);
  if (m) return m[1];
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) return text.slice(first, last + 1);
  throw new Error('No JSON object found');
}
