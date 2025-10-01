export interface TemplateInputSpec {
  type: "string" | "enum";
  required?: boolean;
  values?: string[];
  default?: any;
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
  defaults?: Record<string, any>;
  style?: Record<string, any>;
}

export interface RunArgs {
  [k: string]: any;
  output_format?: "json" | "yaml" | "markdown";
  scope?: string;
  lab?: boolean;
  variant?: string;
}
