// ---------------------------------------------------------------------------
// resolve.ts — Stage 2: token + component resolution, REPEAT/CONDITIONAL expansion
// ---------------------------------------------------------------------------

import { CompilerError, suggest } from "./errors.js";
import type { Registry } from "./registry.js";
import type {
  ImportBundle,
  ImportEntry,
  ResolvedComponent,
  ResolvedKind,
  ResolvedNode,
  ResolvedSceneGraph,
  ResolvedToken,
  SceneGraph,
  SceneNode,
} from "./types.js";

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

const ALIASES: Record<string, string> = {
  bg: "background",
  fg: "foreground",
  xs: "xsmall",
  sm: "small",
  md: "medium",
  lg: "large",
  xl: "xlarge",
  xxl: "xxlarge",
};

type RegistryCategory =
  | "variables"
  | "textStyles"
  | "effectStyles"
  | "components"
  | "icons"
  | "logos";

const CATEGORY_MAP: Record<string, RegistryCategory> = {
  spacing: "variables",
  radius: "variables",
  color: "variables",
  text: "textStyles",
  effect: "effectStyles",
  comp: "components",
  icon: "icons",
  logo: "logos",
};

const KIND_MAP: Record<RegistryCategory, ResolvedKind> = {
  variables: "variable",
  textStyles: "textStyle",
  effectStyles: "effectStyle",
  components: "component",
  icons: "icon",
  logos: "logo",
};

const IMPORT_METHOD_MAP: Record<ResolvedKind, string | null> = {
  variable: "importVariableByKeyAsync",
  textStyle: "importStyleByKeyAsync",
  effectStyle: "importStyleByKeyAsync",
  component: null, // determined per-entry
  icon: "importComponentByKeyAsync",
  logo: "importComponentByKeyAsync",
};

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/** Deep clone via JSON round-trip. */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

/** Expand alias segments. E.g. "bg" → "background". */
function expandAlias(segment: string): string {
  return ALIASES[segment] ?? segment;
}

type WalkCallback = (
  node: ResolvedNode,
  path: string,
  parentChildren: ResolvedNode[],
  index: number,
) => ResolvedNode[] | undefined;

/**
 * Recursively walk nodes. If callback returns an array, it replaces the
 * current node via splice; otherwise recursion proceeds into children,
 * template, and else branches.
 */
export function walkNodes(
  nodes: ResolvedNode[] | undefined,
  callback: WalkCallback,
  path: string,
): void {
  if (!Array.isArray(nodes)) return;
  // Walk backwards so splice mutations don't shift unvisited indices.
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (!node) continue;
    const nodePath = path + "[" + i + "]";
    const replacement = callback(node, nodePath, nodes, i);
    if (replacement !== undefined) {
      nodes.splice(i, 1, ...replacement);
    } else {
      if (Array.isArray(node.children)) {
        walkNodes(node.children, callback, nodePath + ".children");
      }
      if (Array.isArray(node.template)) {
        walkNodes(node.template, callback, nodePath + ".template");
      }
      if (Array.isArray(node.else)) {
        walkNodes(node.else, callback, nodePath + ".else");
      }
    }
  }
}

// ---------------------------------------------------------------------------
// TOKEN RESOLUTION
// ---------------------------------------------------------------------------

/** Score 0 | 40 | 80 | 100 for a candidate name against search segments. */
function scoreCandidate(candidateName: string, segments: readonly string[]): number {
  const lower = candidateName.toLowerCase();
  const expandedFull = segments.map(expandAlias).join("/");
  if (lower === expandedFull) return 100;
  const allPresent = segments.every((seg) => {
    const expanded = expandAlias(seg);
    return lower.indexOf(expanded) !== -1 || lower.indexOf(seg) !== -1;
  });
  if (allPresent) return 80;
  const anyPresent = segments.some((seg) => {
    const expanded = expandAlias(seg);
    return lower.indexOf(expanded) !== -1 || lower.indexOf(seg) !== -1;
  });
  if (anyPresent) return 40;
  return 0;
}

interface ResolveTokenResult {
  resolved: ResolvedToken | null;
  error: CompilerError | null;
}

interface ResolveComponentResult {
  resolved: ResolvedComponent | null;
  error: CompilerError | null;
}

type RegistryIndex = {
  byName: Map<string, { key: string; name: string; type?: string; properties?: Record<string, unknown> }>;
};

/**
 * Resolve a single $token reference against the registry.
 */
export function resolveTokenRef(ref: string, registry: Registry): ResolveTokenResult {
  const stripped = ref.replace(/^\$/, "");
  const parts = stripped.split("/");
  const categoryKey = parts[0]!;
  const registryKey = CATEGORY_MAP[categoryKey];

  if (!registryKey) {
    return {
      resolved: null,
      error: new CompilerError("RESOLVE_TOKEN_NOT_FOUND", {
        message: 'Unknown token category "' + categoryKey + '" in "' + ref + '"',
        path: ref,
      }),
    };
  }

  const kind = KIND_MAP[registryKey];
  const index = (registry as unknown as Record<string, RegistryIndex | undefined>)[registryKey];

  if (!index) {
    return {
      resolved: null,
      error: new CompilerError("RESOLVE_TOKEN_NOT_FOUND", {
        message: 'Registry "' + registryKey + '" is empty or missing for "' + ref + '"',
        path: ref,
      }),
    };
  }

  // For components/icons/logos: use byName with the name portion
  if (registryKey === "components" || registryKey === "icons" || registryKey === "logos") {
    const name = parts.slice(1).join("/");
    const lookupKey = registryKey === "components" ? name.toLowerCase() : name;
    const entry = index.byName.get(lookupKey);
    if (entry) {
      const importMethod =
        registryKey === "components"
          ? entry.type === "COMPONENT_SET"
            ? "importComponentSetByKeyAsync"
            : "importComponentByKeyAsync"
          : IMPORT_METHOD_MAP[kind];
      return {
        resolved: { ref, key: entry.key, name: entry.name, kind, importMethod },
        error: null,
      };
    }
    const allNames = Array.from(index.byName.keys());
    const suggestions = suggest(lookupKey, allNames);
    return {
      resolved: null,
      error: new CompilerError("RESOLVE_TOKEN_NOT_FOUND", {
        message: 'Token "' + ref + '" not found in ' + registryKey + " registry",
        path: ref,
        suggestion: suggestions.length ? suggestions : null,
      }),
    };
  }

  // For variables, textStyles, effectStyles: use byName first, then segment scoring.
  const nameParts = parts.slice(1);
  const searchSegments = parts;
  const expandedName = parts.map(expandAlias).join("/");
  const expandedNameNoCat = nameParts.map(expandAlias).join("/");

  const exactCandidates = [expandedName, expandedNameNoCat, stripped, nameParts.join("/")];
  let exactHit: { key: string; name: string } | null = null;
  for (const candidate of exactCandidates) {
    if (exactHit) break;
    if (index.byName && index.byName.has(candidate)) {
      exactHit = index.byName.get(candidate)!;
    }
  }
  if (exactHit) {
    return {
      resolved: {
        ref,
        key: exactHit.key,
        name: exactHit.name,
        kind,
        importMethod: IMPORT_METHOD_MAP[kind],
      },
      error: null,
    };
  }

  // Score all candidates — try both with and without category prefix
  let bestEntry: { key: string; name: string } | null = null;
  let bestScore = 0;
  if (index.byName) {
    index.byName.forEach((entry, name) => {
      const s1 = scoreCandidate(name, searchSegments);
      const s2 = scoreCandidate(name, nameParts);
      const score = Math.max(s1, s2);
      if (score > bestScore) {
        bestEntry = entry;
        bestScore = score;
      }
    });
  }

  if (bestScore > 40 && bestEntry) {
    const entry: { key: string; name: string } = bestEntry;
    return {
      resolved: {
        ref,
        key: entry.key,
        name: entry.name,
        kind,
        importMethod: IMPORT_METHOD_MAP[kind],
      },
      error: null,
    };
  }

  const allNames = index.byName ? Array.from(index.byName.keys()) : [];
  const suggestions = suggest(stripped, allNames);
  return {
    resolved: null,
    error: new CompilerError("RESOLVE_TOKEN_NOT_FOUND", {
      message: 'Token "' + ref + '" not found in ' + registryKey + " registry",
      path: ref,
      suggestion: suggestions.length ? suggestions : null,
    }),
  };
}

// ---------------------------------------------------------------------------
// COMPONENT RESOLUTION
// ---------------------------------------------------------------------------

/**
 * Resolve a component name to a registry entry.
 */
export function resolveComponent(name: string, registry: Registry): ResolveComponentResult {
  const lower = name.toLowerCase();

  if (registry.components && registry.components.byName.has(lower)) {
    const entry = registry.components.byName.get(lower)!;
    const importMethod =
      entry.type === "COMPONENT_SET"
        ? "importComponentSetByKeyAsync"
        : "importComponentByKeyAsync";
    return {
      resolved: {
        ref: name,
        key: entry.key,
        name: entry.name,
        kind: "component",
        type: entry.type,
        properties: entry.properties,
        importMethod,
      },
      error: null,
    };
  }

  if (registry.icons && registry.icons.byName.has(name)) {
    const entry = registry.icons.byName.get(name)!;
    return {
      resolved: {
        ref: name,
        key: entry.key,
        name: entry.name,
        kind: "icon",
        type: entry.type ?? "COMPONENT",
        properties: {},
        importMethod: "importComponentByKeyAsync",
      },
      error: null,
    };
  }

  if (registry.logos && registry.logos.byName.has(name)) {
    const entry = registry.logos.byName.get(name)!;
    return {
      resolved: {
        ref: name,
        key: entry.key,
        name: entry.name,
        kind: "logo",
        type: entry.type ?? "COMPONENT",
        properties: {},
        importMethod: "importComponentByKeyAsync",
      },
      error: null,
    };
  }

  const candidates: string[] = []
    .concat((registry.allComponentNames ?? []) as never[])
    .concat((registry.allVariableNames ?? []) as never[])
    .concat(registry.icons ? (Array.from(registry.icons.byName.keys()) as never[]) : [])
    .concat(registry.logos ? (Array.from(registry.logos.byName.keys()) as never[]) : []);
  const suggestions = suggest(lower, candidates);

  return {
    resolved: null,
    error: new CompilerError("RESOLVE_COMPONENT_NOT_FOUND", {
      message: 'Component "' + name + '" not found in any registry',
      node: name,
      suggestion: suggestions.length ? suggestions : null,
    }),
  };
}

// ---------------------------------------------------------------------------
// VARIANT VALIDATION
// ---------------------------------------------------------------------------

/**
 * Validate variant keys against component properties.
 */
function validateVariants(
  variantMap: Record<string, string>,
  componentEntry: ResolvedComponent,
  nodeName: string,
  nodePath: string,
): CompilerError[] {
  const errors: CompilerError[] = [];
  const props = (componentEntry.properties ?? {}) as Record<string, unknown>;

  Object.keys(variantMap).forEach((key) => {
    const propKeys = Object.keys(props);
    const matchingProp = propKeys.find((pk) => pk.toLowerCase() === key.toLowerCase());

    if (!matchingProp) {
      const suggestions = suggest(key, propKeys);
      errors.push(
        new CompilerError("RESOLVE_VARIANT_INVALID", {
          message:
            'Variant key "' +
            key +
            '" does not exist on component "' +
            componentEntry.name +
            '"',
          node: nodeName,
          path: nodePath + ".variant." + key,
          suggestion: suggestions.length ? suggestions : null,
        }),
      );
      return;
    }

    const propDef = props[matchingProp];
    if (typeof propDef === "string" && propDef.indexOf("VARIANT(") === 0) {
      const allowedStr = propDef.slice(8, -1);
      const allowed = allowedStr.split(",").map((s) => s.trim());
      const value = variantMap[key]!;
      if (allowed.indexOf(value) === -1) {
        errors.push(
          new CompilerError("RESOLVE_VARIANT_INVALID", {
            message:
              'Variant "' +
              key +
              "=" +
              value +
              '" is not valid for "' +
              componentEntry.name +
              '". Allowed: ' +
              allowed.join(", "),
            node: nodeName,
            path: nodePath + ".variant." + key,
          }),
        );
      }
    }
  });

  return errors;
}

// ---------------------------------------------------------------------------
// REPEAT EXPANSION
// ---------------------------------------------------------------------------

/**
 * Replace {{key}} placeholders in all `characters` fields of a cloned tree.
 */
function bindPlaceholders(node: SceneNode, row: Record<string, string>): void {
  if (typeof node.characters === "string") {
    const raw: Record<string, unknown> = node as unknown as Record<string, unknown>;
    let characters = node.characters;
    Object.keys(row).forEach((key) => {
      characters = characters.split("{{" + key + "}}").join(row[key]!);
    });
    raw["characters"] = characters;
  }
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => bindPlaceholders(child, row));
  }
  if (Array.isArray(node.template)) {
    node.template.forEach((child) => bindPlaceholders(child, row));
  }
}

/**
 * Expand a REPEAT node into cloned children.
 */
function expandRepeat(node: SceneNode): SceneNode[] {
  const data = node.data;
  const count = data ? data.length : node.count ?? 0;
  const template = node.template ?? [];
  const result: SceneNode[] = [];

  for (let i = 0; i < count; i++) {
    template.forEach((tmpl) => {
      const cloned = deepClone(tmpl);
      if (data && data[i]) {
        bindPlaceholders(cloned, data[i]);
      }
      result.push(cloned);
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// CONDITIONAL EVALUATION
// ---------------------------------------------------------------------------

/**
 * Evaluate a simple `when` expression.
 * Supports: boolean names ("showHeader"), equality ("variant == 'premium'"),
 * inequality ("plan != 'free'").
 */
function evaluateWhen(expr: string | undefined): boolean {
  if (!expr || typeof expr !== "string") return false;
  const trimmed = expr.trim();

  const eqMatch = trimmed.match(/^(\w+)\s*==\s*['"](.+?)['"]$/);
  if (eqMatch) {
    // In a static context without runtime bindings, equality expressions
    // are truthy (they describe a design condition that was chosen).
    return true;
  }

  const neqMatch = trimmed.match(/^(\w+)\s*!=\s*['"](.+?)['"]$/);
  if (neqMatch) {
    return true;
  }

  if (trimmed === "false" || trimmed === "0" || trimmed === "") return false;
  return true;
}

// ---------------------------------------------------------------------------
// TOKEN FIELD DETECTION
// ---------------------------------------------------------------------------

const TOKEN_FIELDS = [
  "fill",
  "stroke",
  "gap",
  "radius",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "radiusTopLeft",
  "radiusTopRight",
  "radiusBottomLeft",
  "radiusBottomRight",
  "textStyle",
  "effectStyle",
] as const;

type TokenField = (typeof TOKEN_FIELDS)[number];

/** Check whether a string value is a token reference. */
function isTokenRef(value: unknown): value is string {
  return typeof value === "string" && value.charAt(0) === "$";
}

// ---------------------------------------------------------------------------
// IMPORT COLLECTOR
// ---------------------------------------------------------------------------

/**
 * Collect unique imports from resolved tokens in the graph.
 */
function collectImports(nodes: readonly ResolvedNode[]): ImportBundle {
  const seen = new Map<string, true>();
  const imports: Required<Pick<ImportBundle, "variables" | "components" | "textStyles" | "fonts">> = {
    variables: [],
    components: [],
    textStyles: [],
    fonts: [],
  };

  function visit(value: unknown): void {
    if (!value || typeof value !== "object") return;
    const token = value as Partial<ResolvedToken>;
    if (token.key && token.kind && !seen.has(token.key)) {
      seen.set(token.key, true);
      const entry = token as ImportEntry;
      if (token.kind === "variable") {
        imports.variables.push(entry);
      } else if (token.kind === "component" || token.kind === "icon" || token.kind === "logo") {
        imports.components.push(entry);
      } else if (token.kind === "textStyle" || token.kind === "effectStyle") {
        imports.textStyles.push(entry);
      }
    }
  }

  function walkForImports(nodeList: readonly ResolvedNode[] | undefined): void {
    if (!Array.isArray(nodeList)) return;
    nodeList.forEach((node) => {
      if (!node || typeof node !== "object") return;
      for (const field of TOKEN_FIELDS) {
        visit((node as Record<TokenField, unknown>)[field]);
      }
      if (node._resolvedComponent) {
        visit(node._resolvedComponent);
      }
      if (node._resolvedSwaps) {
        Object.keys(node._resolvedSwaps).forEach((k) => {
          visit(node._resolvedSwaps![k]);
        });
      }
      if (Array.isArray(node.children)) walkForImports(node.children);
    });
  }

  walkForImports(nodes);
  return imports;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

export interface ResolveResult {
  graph: ResolvedSceneGraph;
  errors: CompilerError[];
  warnings: CompilerError[];
  imports: ImportBundle;
}

/**
 * Stage 2 of the compilation pipeline.
 * Walks the validated scene graph and resolves all token references,
 * component references, REPEAT expansions, and CONDITIONAL evaluations.
 */
export function resolve(graph: SceneGraph, registry: Registry): ResolveResult {
  const resolved: ResolvedSceneGraph = deepClone(graph) as ResolvedSceneGraph;
  const errors: CompilerError[] = [];
  const warnings: CompilerError[] = [];

  // ── Pass 1: Expand REPEAT and CONDITIONAL nodes ──────────────────────────

  walkNodes(
    resolved.nodes,
    (node) => {
      if (node.type === "REPEAT") {
        return expandRepeat(node);
      }
      if (node.type === "CONDITIONAL") {
        const truthy = evaluateWhen(node.when);
        if (truthy) {
          return node.children ?? [];
        }
        return node.else ?? [];
      }
      return undefined;
    },
    "nodes",
  );

  // ── Pass 2: Resolve token references on all nodes ────────────────────────

  walkNodes(
    resolved.nodes,
    (node, nodePath) => {
      const nodeName = node.name ?? "(unnamed)";

      // Resolve token fields
      for (const field of TOKEN_FIELDS) {
        const value = (node as Record<TokenField, unknown>)[field];
        if (isTokenRef(value)) {
          const result = resolveTokenRef(value, registry);
          if (result.resolved) {
            (node as Record<string, unknown>)[field] = result.resolved;
          } else if (result.error) {
            result.error.node = result.error.node ?? nodeName;
            result.error.path = result.error.path ?? nodePath + "." + field;
            errors.push(result.error);
          }
        }
      }

      // Resolve INSTANCE component references
      if (node.type === "INSTANCE" && node.component) {
        const compResult = resolveComponent(node.component, registry);
        if (compResult.resolved) {
          node._resolvedComponent = compResult.resolved;

          if (node.variant && compResult.resolved.properties) {
            const variantErrors = validateVariants(
              node.variant,
              compResult.resolved,
              nodeName,
              nodePath,
            );
            for (const ve of variantErrors) {
              if (ve.severity === "warning") {
                warnings.push(ve);
              } else {
                errors.push(ve);
              }
            }
          }

          if (node.swaps) {
            node._resolvedSwaps = {};
            Object.keys(node.swaps).forEach((swapKey) => {
              const swapName = node.swaps![swapKey]!;
              const swapResult = resolveComponent(swapName, registry);
              if (swapResult.resolved) {
                node._resolvedSwaps![swapKey] = swapResult.resolved;
              } else if (swapResult.error) {
                swapResult.error.path = nodePath + ".swaps." + swapKey;
                errors.push(swapResult.error);
              }
            });
          }
        } else if (compResult.error) {
          compResult.error.node = nodeName;
          compResult.error.path = compResult.error.path ?? nodePath + ".component";
          errors.push(compResult.error);
        }
      }

      return undefined;
    },
    "nodes",
  );

  // ── Pass 3: Collect imports ──────────────────────────────────────────────

  const imports = collectImports(resolved.nodes);

  // Add fonts from the graph metadata
  if (Array.isArray(resolved.fonts)) {
    imports.fonts = resolved.fonts.map((f) => ({ family: f.family, style: f.style }));
  }

  return {
    graph: resolved,
    errors,
    warnings,
    imports,
  };
}
