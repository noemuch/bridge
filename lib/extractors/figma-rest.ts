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
  node_id?: string;
  description?: string;
  containing_frame?: { pageName?: string };
}

interface FigmaComponentsResponse {
  meta?: { components?: FigmaComponent[] };
}

interface FigmaComponentSet {
  key: string;
  name: string;
  node_id?: string;
  description?: string;
  containing_frame?: { pageName?: string };
}

interface FigmaComponentSetsResponse {
  meta?: { component_sets?: FigmaComponentSet[] };
}

// /v1/files/{key}/nodes?ids=... returns rich node data, including
// `componentPropertyDefinitions` on COMPONENT_SET nodes — the only REST
// surface that exposes variant / property metadata. See the official spec at
// https://developers.figma.com/docs/rest-api/component-types/.
interface FigmaComponentPropertyDefinition {
  type: "BOOLEAN" | "TEXT" | "INSTANCE_SWAP" | "VARIANT";
  defaultValue?: boolean | string;
  variantOptions?: string[];
}

interface FigmaNodeDocument {
  id: string;
  type: string;
  name?: string;
  children?: Array<{ id: string; type: string }>;
  componentPropertyDefinitions?: Record<string, FigmaComponentPropertyDefinition>;
}

interface FigmaNodesResponse {
  nodes: Record<string, { document?: FigmaNodeDocument } | null>;
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

/** Sentinel thrown when the variables endpoint is not available for the
 * token's plan tier. The Figma `/variables/local` REST endpoint is
 * Enterprise-only — non-Enterprise tokens get a 403. Callers should treat
 * this as "variables unavailable" rather than a hard error. */
export class VariablesEndpointUnavailableError extends Error {
  constructor(public readonly status: number) {
    super(
      `Figma /variables/local returned ${status}. The endpoint is Enterprise-only; on other plans, refresh variables via the MCP path instead.`
    );
    this.name = "VariablesEndpointUnavailableError";
  }
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

export async function extractVariablesFromFigma(
  opts: FigmaExtractOptions
): Promise<VariableRegistry> {
  if (!opts.token) throw new Error("FIGMA_TOKEN is required");
  const f = opts.fetchImpl ?? fetch;
  const ts = new Date().toISOString();

  const res = await f(`${BASE}/files/${opts.fileKey}/variables/local`, {
    headers: { "X-Figma-Token": opts.token },
  });
  if (!res.ok) {
    if (res.status === 403 || res.status === 404) {
      throw new VariablesEndpointUnavailableError(res.status);
    }
    throw new Error(`GET /variables/local failed: ${res.status}`);
  }
  const varsBody = (await res.json()) as FigmaVariablesResponse;
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

  return { version: 1, generatedAt: ts, variables };
}

/** Convert a Figma component-property definition into the string-encoded
 * form the Bridge compiler expects on disk:
 * - VARIANT(opt1,opt2,opt3) for variant props
 * - "BOOLEAN" / "TEXT" / "INSTANCE_SWAP" for the other types
 *
 * The compiler's variant validator (`lib/compiler/resolve.ts`) reads this
 * encoded string verbatim, so the format must match exactly. */
function encodePropertyDef(def: FigmaComponentPropertyDefinition): string {
  if (def.type === "VARIANT") {
    const opts = def.variantOptions ?? [];
    return `VARIANT(${opts.join(",")})`;
  }
  return def.type;
}

const MAX_NODE_IDS_PER_BATCH = 50;

/** Fetch rich node data for the given Figma node IDs in batches. Returns a
 * flat map from node ID to the document. Missing nodes are silently
 * omitted (caller treats absence as "no metadata available"). */
async function fetchNodes(
  fileKey: string,
  ids: string[],
  token: string,
  f: typeof fetch
): Promise<Record<string, FigmaNodeDocument>> {
  const out: Record<string, FigmaNodeDocument> = {};
  for (let i = 0; i < ids.length; i += MAX_NODE_IDS_PER_BATCH) {
    const batch = ids.slice(i, i + MAX_NODE_IDS_PER_BATCH);
    if (batch.length === 0) continue;
    const url = `${BASE}/files/${fileKey}/nodes?ids=${encodeURIComponent(batch.join(","))}&depth=1`;
    const body = await fget<FigmaNodesResponse>(url, token, f);
    for (const [id, entry] of Object.entries(body.nodes ?? {})) {
      if (entry?.document) out[id] = entry.document;
    }
  }
  return out;
}

export async function extractComponentsFromFigma(
  opts: FigmaExtractOptions
): Promise<ComponentRegistry> {
  if (!opts.token) throw new Error("FIGMA_TOKEN is required");
  const f = opts.fetchImpl ?? fetch;
  const ts = new Date().toISOString();

  // Pass 1: list components and component sets in parallel. /components
  // returns every variant instance inside a SET as a separate entry — the
  // Figma REST API does not expose a `componentSetId` field, so we cannot
  // filter on that. We deduplicate against the SET children list in pass 3.
  const [compBody, setBody] = await Promise.all([
    fget<FigmaComponentsResponse>(`${BASE}/files/${opts.fileKey}/components`, opts.token, f),
    fget<FigmaComponentSetsResponse>(`${BASE}/files/${opts.fileKey}/component_sets`, opts.token, f),
  ]);
  const allComponents = compBody.meta?.components ?? [];
  const componentSets = setBody.meta?.component_sets ?? [];

  // Pass 2: batch-fetch rich node data for every component-set ID so we can
  // read componentPropertyDefinitions, count variants, AND collect the
  // variant node IDs for the dedup pass.
  const setNodeIds = componentSets.map((s) => s.node_id).filter((id): id is string => !!id);
  const nodeDocs = setNodeIds.length
    ? await fetchNodes(opts.fileKey, setNodeIds, opts.token, f)
    : {};

  // Pass 3: build the set of node IDs that belong to a COMPONENT_SET. Any
  // /components entry whose node_id is in this set is a variant instance,
  // not a standalone component — drop it.
  const variantNodeIds = new Set<string>();
  for (const doc of Object.values(nodeDocs)) {
    for (const child of doc.children ?? []) variantNodeIds.add(child.id);
  }
  // Secondary heuristic: Figma's variant-naming convention requires every
  // variant name to be of the form `key=value` or `key1=value1, key2=value2`.
  // A small number of variants slip past the node-ID dedup when their parent
  // set is unpublished — we still want them out of the registry.
  const looksLikeVariantName = (name: string): boolean => /^\w[\w-]*=/.test(name);

  const standaloneComps = allComponents.filter((c) => {
    if (c.node_id && variantNodeIds.has(c.node_id)) return false;
    if (looksLikeVariantName(c.name)) return false;
    return true;
  });

  // Emit the on-disk shape the compiler actually consumes — `properties` as a
  // record of string-encoded types, `variants` as the variant count, the
  // node id and containing page surfaced as `id` and `page`.
  const components: Array<Record<string, unknown>> = [];

  for (const set of componentSets) {
    const doc = set.node_id ? nodeDocs[set.node_id] : undefined;
    const propDefs = doc?.componentPropertyDefinitions ?? {};
    const properties: Record<string, string> = {};
    for (const [propKey, def] of Object.entries(propDefs)) {
      properties[propKey] = encodePropertyDef(def);
    }
    components.push({
      name: set.name,
      key: set.key,
      id: set.node_id,
      type: "COMPONENT_SET",
      variants: doc?.children?.length ?? 0,
      page: set.containing_frame?.pageName,
      category: categoryFromPage(set.containing_frame?.pageName),
      properties,
      description: set.description,
    });
  }

  for (const c of standaloneComps) {
    components.push({
      name: c.name,
      key: c.key,
      id: c.node_id,
      type: "COMPONENT",
      page: c.containing_frame?.pageName,
      category: categoryFromPage(c.containing_frame?.pageName),
      properties: {},
      description: c.description,
    });
  }

  // Cast to the typed registry. The on-disk type is intentionally looser
  // than the formal ComponentEntry interface — see lib/compiler/registry.ts
  // which normalizes either shape at read time.
  return {
    version: 1,
    generatedAt: ts,
    components: components as unknown as ComponentRegistry["components"],
  };
}

export async function extractTextStylesFromFigma(
  opts: FigmaExtractOptions
): Promise<TextStyleRegistry> {
  if (!opts.token) throw new Error("FIGMA_TOKEN is required");
  const f = opts.fetchImpl ?? fetch;
  const ts = new Date().toISOString();

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

  return { version: 1, generatedAt: ts, styles: textStyles };
}

export async function extractFromFigma(opts: FigmaExtractOptions): Promise<FigmaExtractResult> {
  const [variables, components, textStyles] = await Promise.all([
    extractVariablesFromFigma(opts),
    extractComponentsFromFigma(opts),
    extractTextStylesFromFigma(opts),
  ]);
  return { variables, components, textStyles };
}
