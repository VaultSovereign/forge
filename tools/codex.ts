import fs from "node:fs/promises";
import path from "node:path";
import lunr from "lunr";

type CorpusDoc = {
  id: string;
  title: string;
  path: string;
  content: string;
  kind: string;
};

type SearchHit = {
  id: string;
  title: string;
  path: string;
  score: number;
  snippet: string;
  kind?: string;
};

const SEARCH_ROOTS = [
  "docs",
  "README.md",
  "AGENTS.md", // Contribution guidelines
  "catalog",
  "profiles",
  "schemas",
  "examples",
  "reality_ledger",
  "scripts",
  "cli",
  "dispatcher",
  "agent",
  "tools",
  "mcp",
  "workbench"
];

const SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".next", ".turbo"]);
const FILE_PATTERN = /\.(md|markdown|yaml|yml|json|ts|tsx|py|proto)$/i;

let index: lunr.Index | null = null;
let corpus: Record<string, CorpusDoc> = {};
let building = false;
let buildPromise: Promise<void> | null = null;

async function readFileIfExists(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

async function walk(dir: string, files: string[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        await walk(fullPath, files);
      }
    } else if (FILE_PATTERN.test(entry.name)) {
      files.push(fullPath);
    }
  }
}

function makeSnippet(content: string, query: string, width = 160): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const lower = normalized.toLowerCase();
  const needle = query.toLowerCase();
  const idx = lower.indexOf(needle);
  if (idx < 0) {
    return normalized.slice(0, width) + (normalized.length > width ? "…" : "");
  }
  const start = Math.max(0, idx - Math.floor(width / 3));
  const end = Math.min(normalized.length, idx + Math.floor((2 * width) / 3));
  const prefix = start > 0 ? "…" : "";
  const suffix = end < normalized.length ? "…" : "";
  return `${prefix}${normalized.slice(start, end)}${suffix}`;
}

export async function buildIndex(): Promise<void> {
  if (index && Object.keys(corpus).length > 0) return;
  if (building) {
    await buildPromise;
    return;
  }
  building = true;
  buildPromise = (async () => {
    const documents: Record<string, CorpusDoc> = {};
    const files: string[] = [];

  for (const root of SEARCH_ROOTS) {
    const target = path.join(process.cwd(), root);
    const stat = await fs.stat(target).catch(() => null);
    if (!stat) continue;

    if (stat.isDirectory()) {
      await walk(target, files);
    } else {
      files.push(target);
    }
  }

  let counter = 0;
  for (const file of files) {
    const content = await readFileIfExists(file);
    if (!content.trim()) continue;

    const id = String(++counter);
    const kind = path.extname(file).slice(1).toLowerCase();
    documents[id] = {
      id,
      title: path.basename(file),
      path: file,
      content,
      kind
    };
  }

  const newIndex = lunr(function () {
    this.ref("id");
    this.field("title");
    this.field("content");

    Object.values(documents).forEach((doc) => {
      this.add({ id: doc.id, title: doc.title, content: doc.content });
    });
  });

    corpus = documents;
    index = newIndex;
  })();

  try {
    await buildPromise;
  } finally {
    building = false;
    buildPromise = null;
  }
}

export async function searchCodex(query: string, k = 8): Promise<SearchHit[]> {
  if (!index) {
    await buildIndex();
  }
  if (!index) return [];

  const results = index.search(query).slice(0, k);
  return results.map((result) => {
    const doc = corpus[result.ref];
    return {
      id: result.ref,
      title: doc.title,
      path: doc.path,
      score: Number(result.score ?? 0),
      snippet: makeSnippet(doc.content, query),
      kind: doc.kind
    };
  });
}

export async function getDoc(id: string): Promise<CorpusDoc | null> {
  if (!index) {
    await buildIndex();
  }
  return corpus[id] ?? null;
}
