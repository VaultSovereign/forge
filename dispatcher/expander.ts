/**
 * Minimal Mustache-like expander with {{var}} and {{#each arr}}...{{/each}}
 */
export function expand(template: string, ctx: Record<string, any>): string {
  let out = template;

  // each blocks
  const eachRegex = /\{\{#each\s+([^\}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
  out = out.replace(eachRegex, (_m, path, block) => {
    const arr = getPath(ctx, path.trim());
    if (!Array.isArray(arr)) return '';
    return arr.map((item: any) => block.replace(/\{\{\s*this\s*\}\}/g, String(item))).join('');
  });

  // simple vars e.g., {{purpose}} or {{profile.voice}}
  const varRegex = /\{\{\s*([^\}\s]+)\s*\}\}/g;
  out = out.replace(varRegex, (_m, path) => {
    const v = getPath(ctx, path.trim());
    return v == null ? '' : String(v);
  });

  return out;
}

function getPath(o: any, p: string): any {
  return p.split('.').reduce((acc: any, k: string) => (acc ? acc[k] : undefined), o);
}
