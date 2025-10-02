/**
 * Minimal Mustache-like expander with {{var}} and {{#each arr}}...{{/each}}
 */
export function expand(template: string, ctx: Record<string, unknown>): string {
  let out = template;

  // each blocks
  const eachRegex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
  out = out.replace(eachRegex, (_m, path, block) => {
    const arr = getPath(ctx, path.trim());
    if (!Array.isArray(arr)) return '';
    return arr.map((item: unknown) => block.replace(/\{\{\s*this\s*\}\}/g, String(item))).join('');
  });

  // simple vars e.g., {{purpose}} or {{profile.voice}}
  const varRegex = /\{\{\s*([^}\s]+)\s*\}\}/g;
  out = out.replace(varRegex, (_m, path) => {
    const v = getPath(ctx, path.trim());
    return v == null ? '' : String(v);
  });

  return out;
}

function getPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, segment) => {
    if (acc == null) return undefined;
    if (Array.isArray(acc)) {
      const index = Number(segment);
      return Number.isInteger(index) ? acc[index] : undefined;
    }
    if (typeof acc === 'object') {
      return (acc as Record<string, unknown>)[segment];
    }
    return undefined;
  }, source);
}
