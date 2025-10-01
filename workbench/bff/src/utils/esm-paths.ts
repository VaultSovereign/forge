import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

export function fromHere(metaUrl: string, ...rel: string[]) {
  const base = path.dirname(fileURLToPath(metaUrl));
  return path.resolve(base, ...rel);
}

export { pathToFileURL };

