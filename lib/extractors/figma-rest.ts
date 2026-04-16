import type {
  ComponentRegistry,
  VariableRegistry,
  TextStyleRegistry,
  Category,
} from "../kb/registry-io.js";

export interface FigmaExtractOptions {
  fileKey: string;
  token: string;
  fetchImpl?: typeof fetch;
}

export interface FigmaExtractResult {
  variables: VariableRegistry;
  components: ComponentRegistry;
  textStyles: TextStyleRegistry;
}

// Narrow shape types for the subset of the Figma REST API we consume.
// Full schemas live at https://www.figma.com/developers/api — we only pick the
// fields we actually read, so upstream additions don't break us.
interface FigmaMode {
  modeId: string;
  name: string;
}

interface FigmaVariableCollection {
  id: string;
  modes?: FigmaMode[];
}

interface FigmaVariable {
  key: string;
  name: string;
  variableCollectionId: string;
  resolvedType: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN";
  scopes?: string[];
  valuesByMode?: Record<string, unknown>;
}

interface FigmaVariablesResponse {
  meta?: {
    variableCollections?: Record<string, FigmaVariableCollection>;
    variables?: Record<string, FigmaVariable>;
  };
}

interface FigmaComponent {
  key: string;
  name: string;
  description?: string;
  containing_frame?: { pageName?: string };
}

interface FigmaComponentsResponse {
  meta?: { components?: FigmaComponent[] };
}

interface FigmaStyle {
  key: string;
  name: string;
  style_type: string;
}

interface FigmaStylesResponse {
  meta?: { styles?: FigmaStyle[] };
}

const BASE = "https://api.figma.com/v1";

async function fget<T>(url: string, token: string, f: typeof fetch = fetch): Promise<T> {
  const res = await f(url, { headers: { "X-Figma-Token": token } });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return (await res.json()) as T;
}

function categoryFromPage(page: string | undefined): Category {
  if (!page) return "layout";
  const p = page.toLowerCase();
  if (p.includes("action")) return "actions";
  if (p.includes("form")) return "forms";
  if (p.includes("data") || p.includes("display")) return "data-display";
  if (p.includes("feedback")) return "feedback";
  if (p.includes("nav")) return "navigation";
  if (p.includes("overlay") || p.includes("modal") || p.includes("dialog")) return "overlay";
  if (p.includes("surface")) return "surface";
  return "layout";
}

export async function extractFromFigma(opts: FigmaExtractOptions): Promise<FigmaExtractResult> {
  if (!opts.token) throw new Error("FIGMA_TOKEN is required");
  const f = opts.fetchImpl ?? fetch;
  const ts = new Date().toISOString();

  const varsBody = await fget<FigmaVariablesResponse>(
    `${BASE}/files/${opts.fileKey}/variables/local`,
    opts.token,
    f
  );
  const collections = varsBody.meta?.variableCollections ?? {};
  const varDefs = varsBody.meta?.variables ?? {};

  const modeLabelByCollection: Record<string, Record<string, string>> = {};
  for (const c of Object.values(collections)) {
    const modeMap: Record<string, string> = {};
    for (const m of c.modes ?? []) modeMap[m.modeId] = m.name;
    modeLabelByCollection[c.id] = modeMap;
  }

  const variables = Object.values(varDefs).map((v) => {
    const modeMap = modeLabelByCollection[v.variableCollectionId] ?? {};
    const valuesByMode: Record<string, unknown> = {};
    for (const [modeId, value] of Object.entries(v.valuesByMode ?? {})) {
      const label = modeMap[modeId] ?? modeId;
      valuesByMode[label] = value;
    }
    return {
      key: v.key,
      name: v.name,
      resolvedType: v.resolvedType,
      valuesByMode,
      scopes: v.scopes,
    };
  });

  const compBody = await fget<FigmaComponentsResponse>(
    `${BASE}/files/${opts.fileKey}/components`,
    opts.token,
    f
  );
  const compsArr = compBody.meta?.components ?? [];
  const components = compsArr.map((c) => ({
    key: c.key,
    name: c.name,
    category: categoryFromPage(c.containing_frame?.pageName),
    status: "stable" as const,
    variants: [],
    properties: [],
    description: c.description,
  }));

  const stylesBody = await fget<FigmaStylesResponse>(
    `${BASE}/files/${opts.fileKey}/styles`,
    opts.token,
    f
  );
  const stylesArr = stylesBody.meta?.styles ?? [];
  const textStylesOnly = stylesArr.filter((s) => s.style_type === "TEXT");
  const textStyles = textStylesOnly.map((s) => ({
    key: s.key,
    name: s.name,
    fontFamily: "Inter",
    fontStyle: "Regular",
    fontSize: 14,
    lineHeight: 20,
  }));

  return {
    variables: { version: 1, generatedAt: ts, variables },
    components: { version: 1, generatedAt: ts, components },
    textStyles: { version: 1, generatedAt: ts, styles: textStyles },
  };
}
