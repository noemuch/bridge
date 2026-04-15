import type { ComponentRegistry, VariableRegistry, TextStyleRegistry, Category } from "../kb/registry-io.js";

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

const BASE = "https://api.figma.com/v1";

async function fget(url: string, token: string, f: typeof fetch = fetch): Promise<any> {
  const res = await f(url, { headers: { "X-Figma-Token": token } });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json();
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

  const varsBody = await fget(`${BASE}/files/${opts.fileKey}/variables/local`, opts.token, f);
  const varsMeta = varsBody.meta || {};
  const collections = varsMeta.variableCollections || {};
  const varDefs = varsMeta.variables || {};
  const modeLabelByCollection: Record<string, Record<string, string>> = {};
  for (const c of Object.values<any>(collections)) {
    const modeMap: Record<string, string> = {};
    for (const m of c.modes || []) modeMap[m.modeId] = m.name;
    modeLabelByCollection[c.id] = modeMap;
  }

  const variables = Object.values<any>(varDefs).map((v) => {
    const modeMap = modeLabelByCollection[v.variableCollectionId] || {};
    const valuesByMode: Record<string, unknown> = {};
    for (const [modeId, value] of Object.entries(v.valuesByMode || {})) {
      const label = modeMap[modeId] ?? modeId;
      valuesByMode[label] = value;
    }
    return { key: v.key, name: v.name, resolvedType: v.resolvedType, valuesByMode, scopes: v.scopes };
  });

  const compBody = await fget(`${BASE}/files/${opts.fileKey}/components`, opts.token, f);
  const compsArr: any[] = compBody.meta?.components || [];
  const components = compsArr.map((c) => ({
    key: c.key,
    name: c.name,
    category: categoryFromPage(c.containing_frame?.pageName),
    status: "stable" as const,
    variants: [],
    properties: [],
    description: c.description,
  }));

  const stylesBody = await fget(`${BASE}/files/${opts.fileKey}/styles`, opts.token, f);
  const stylesArr: any[] = stylesBody.meta?.styles || [];
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
