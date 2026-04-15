import { readFile, writeFile } from "node:fs/promises";

export type Category = "actions" | "forms" | "data-display" | "feedback" | "navigation" | "layout" | "overlay" | "surface";
export type Status = "stable" | "beta" | "deprecated" | "experimental";

export interface ComponentEntry {
  key: string;
  name: string;
  category: Category;
  status: Status;
  variants: Array<{ name: string; values: string[] }>;
  properties: Array<{ name: string; type: string; default?: unknown }>;
  description?: string;
}
export interface ComponentRegistry {
  version: number;
  generatedAt: string;
  components: ComponentEntry[];
}

export interface VariableEntry {
  key: string;
  name: string;
  resolvedType: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN";
  valuesByMode: Record<string, unknown>;
  scopes?: string[];
}
export interface VariableRegistry {
  version: number;
  generatedAt: string;
  variables: VariableEntry[];
}

export interface TextStyleEntry {
  key: string;
  name: string;
  fontFamily: string;
  fontStyle: string;
  fontSize: number;
  lineHeight: number | string;
  letterSpacing?: number;
}
export interface TextStyleRegistry {
  version: number;
  generatedAt: string;
  styles: TextStyleEntry[];
}

async function readJSON<T>(file: string): Promise<T> {
  const raw = await readFile(file, "utf8");
  return JSON.parse(raw) as T;
}

export async function readComponentRegistry(file: string): Promise<ComponentRegistry> {
  const r = await readJSON<ComponentRegistry>(file);
  if (!Array.isArray(r.components)) throw new Error(`${file}: components[] missing`);
  for (const c of r.components) {
    if (!c.key) throw new Error(`${file}: component "${c.name ?? "?"}" missing required "key"`);
  }
  return r;
}

export async function readVariableRegistry(file: string): Promise<VariableRegistry> {
  const r = await readJSON<VariableRegistry>(file);
  if (!Array.isArray(r.variables)) throw new Error(`${file}: variables[] missing`);
  for (const v of r.variables) {
    if (!v.key) throw new Error(`${file}: variable "${v.name ?? "?"}" missing required "key"`);
  }
  return r;
}

export async function readTextStyleRegistry(file: string): Promise<TextStyleRegistry> {
  const r = await readJSON<TextStyleRegistry>(file);
  if (!Array.isArray(r.styles)) throw new Error(`${file}: styles[] missing`);
  return r;
}

export async function writeRegistry(file: string, data: unknown): Promise<void> {
  await writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}
