// Canonical template shapes shared by BFF + FE.
// Keep tiny and stable; extend via index signatures, not breaking fields.

export type TemplateMeta = {
  id: string;
  name: string;
  description?: string;
  version?: string;
  tags?: string[];
  updatedAt?: string; // ISO
  // non-breaking extension space:
  [k: string]: unknown;
};

export type TemplateList = {
  items: TemplateMeta[];
  nextCursor: string | null;
  total: number;
};

export type TemplateCount = { total: number };
