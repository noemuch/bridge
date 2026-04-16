// ---------------------------------------------------------------------------
// codegen.ts — transforms a resolved scene graph into Figma Plugin API code
// ---------------------------------------------------------------------------

import type { Chunk } from "./plan.js";
import type {
  ImportBundle,
  ImportEntry,
  ResolvedNode,
  ResolvedToken,
  CloneOverride,
} from "./types.js";

// ---------------------------------------------------------------------------
// SAFE NAMING
// ---------------------------------------------------------------------------

/**
 * Convert a token ref like "$spacing/md" to a safe JS variable name.
 */
export function refToVarName(ref: string): string {
  const stripped = ref.replace(/^\$/, "");
  return stripped.replace(/[^a-zA-Z0-9]/g, "_");
}

/** Prefix map for node types → variable name prefix. */
const TYPE_PREFIX: Record<string, string> = {
  FRAME: "frame",
  TEXT: "text",
  INSTANCE: "inst",
  CLONE: "clone",
  RECTANGLE: "rect",
  ELLIPSE: "ellipse",
};

/**
 * Build a safe variable name from a node name, with a counter for uniqueness.
 */
export function safeNodeVar(
  type: string,
  name: string | undefined,
  counters: Map<string, number>,
): string {
  const prefix = TYPE_PREFIX[type] ?? "node";
  const slug = (name ?? "unnamed")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
  const base = prefix + "_" + slug;
  const count = (counters.get(base) ?? 0) + 1;
  counters.set(base, count);
  return count === 1 ? base : base + "_" + count;
}

/**
 * Build a safe variable name for an import (variable, component, style).
 */
export function importVarName(
  entry: ImportEntry | ResolvedToken,
  seen: Map<string, string>,
): string {
  if (seen.has(entry.key)) return seen.get(entry.key)!;
  const prefix =
    entry.kind === "variable"
      ? "var"
      : entry.kind === "textStyle"
        ? "style"
        : entry.kind === "effectStyle"
          ? "effect"
          : entry.kind === "component" || entry.kind === "icon" || entry.kind === "logo"
            ? "comp"
            : "imp";
  const slug = (entry.ref || entry.name || entry.key)
    .replace(/^\$/, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
  const name = prefix + "_" + slug;
  seen.set(entry.key, name);
  return name;
}

// ---------------------------------------------------------------------------
// IMPORT CODE GENERATION
// ---------------------------------------------------------------------------

/**
 * Generate import statements for variables, components, and styles.
 * `importNames` is mutated to accumulate `key → varName` mappings.
 */
export function emitImports(
  imports: ImportBundle,
  importNames: Map<string, string>,
  bridgePrefix: string | null,
): string {
  const lines: string[] = [];
  const bp = bridgePrefix ?? "";

  const vars = imports.variables ?? [];
  const comps = imports.components ?? [];
  const styles = imports.textStyles ?? [];

  for (const v of vars) {
    const vn = importVarName(v, importNames);
    lines.push(
      bp +
        "var " +
        vn +
        " = await figma.variables.importVariableByKeyAsync(" +
        JSON.stringify(v.key) +
        ");",
    );
  }

  for (const c of comps) {
    const vn = importVarName(c, importNames);
    const method = c.importMethod ?? "importComponentByKeyAsync";
    lines.push(
      bp + "var " + vn + " = await figma." + method + "(" + JSON.stringify(c.key) + ");",
    );
  }

  for (const s of styles) {
    const vn = importVarName(s, importNames);
    const method = s.importMethod ?? "importStyleByKeyAsync";
    lines.push(
      bp + "var " + vn + " = await figma." + method + "(" + JSON.stringify(s.key) + ");",
    );
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// RESOLVED TOKEN HELPERS
// ---------------------------------------------------------------------------

/**
 * Get the import variable name for a resolved token object.
 */
export function tokenVar(
  token: unknown,
  importNames: Map<string, string>,
): string | null {
  if (!token || typeof token !== "object") return null;
  const key = (token as { key?: unknown }).key;
  if (typeof key !== "string") return null;
  return importNames.get(key) ?? null;
}

// ---------------------------------------------------------------------------
// NODE CODE EMITTERS
// ---------------------------------------------------------------------------

function emitFrame(
  node: ResolvedNode,
  parentVar: string,
  varName: string,
  importNames: Map<string, string>,
  lines: string[],
): void {
  lines.push("var " + varName + " = figma.createFrame();");
  lines.push(varName + ".name = " + JSON.stringify(node.name ?? "Frame") + ";");

  // Layout mode
  if (node.layout && node.layout !== "NONE") {
    lines.push(varName + ".layoutMode = " + JSON.stringify(node.layout) + ";");
  }

  // Rule 4: resize() FIRST, then sizing modes
  if (node.width != null || node.height != null) {
    const w = node.width != null ? node.width : 100;
    const h = node.height != null ? node.height : 100;
    lines.push(varName + ".resize(" + w + ", " + h + ");");
  }

  // Sizing modes (after resize — Rule 4)
  if (node.primaryAxisSizing) {
    lines.push(varName + ".primaryAxisSizingMode = " + JSON.stringify(node.primaryAxisSizing) + ";");
  }
  if (node.counterAxisSizing) {
    lines.push(varName + ".counterAxisSizingMode = " + JSON.stringify(node.counterAxisSizing) + ";");
  }

  // Alignment (Rule 5)
  if (node.primaryAxisAlign) {
    lines.push(varName + ".primaryAxisAlignItems = " + JSON.stringify(node.primaryAxisAlign) + ";");
  }
  if (node.counterAxisAlign) {
    lines.push(varName + ".counterAxisAlignItems = " + JSON.stringify(node.counterAxisAlign) + ";");
  }

  // Gap — Rule 6: bind via variable
  if (node.gap) {
    const gapVar = tokenVar(node.gap, importNames);
    if (gapVar) {
      lines.push(varName + ".setBoundVariable('itemSpacing', " + gapVar + ");");
    }
  }

  emitPadding(node, varName, importNames, lines);
  emitRadius(node, varName, importNames, lines);

  // Fill — Rule 7
  if (node.fill) {
    const fillVar = tokenVar(node.fill, importNames);
    if (fillVar) {
      lines.push(varName + ".fills = mf(" + fillVar + ");");
    }
  }

  emitStroke(node, varName, importNames, lines);

  // Effects
  if (node.effectStyle) {
    const effVar = tokenVar(node.effectStyle, importNames);
    if (effVar) {
      lines.push("await " + varName + ".setEffectStyleIdAsync(" + effVar + ".id);");
    }
  }

  // Clip
  if (node.clip != null) {
    lines.push(varName + ".clipsContent = " + (node.clip ? "true" : "false") + ";");
  }

  emitVisibility(node, varName, lines);

  // Rule 1: appendChild FIRST, then FILL sizing
  lines.push(parentVar + ".appendChild(" + varName + ");");
  emitFillSizing(node, varName, lines);

  // Rule 2: absolute positioning AFTER appendChild
  emitAbsolute(node, varName, lines);
}

function emitText(
  node: ResolvedNode,
  parentVar: string,
  varName: string,
  importNames: Map<string, string>,
  lines: string[],
): void {
  lines.push("var " + varName + " = figma.createText();");
  lines.push(varName + ".name = " + JSON.stringify(node.name ?? "Text") + ";");

  // Rule 12: characters FIRST
  lines.push(varName + ".characters = " + JSON.stringify(node.characters ?? "") + ";");

  // Rule 8: text style via setTextStyleIdAsync (Rule 21: async version)
  if (node.textStyle) {
    const styleVar = tokenVar(node.textStyle, importNames);
    if (styleVar) {
      lines.push("await " + varName + ".setTextStyleIdAsync(" + styleVar + ".id);");
    }
  }

  // Fill color override — Rule 7
  if (node.fill) {
    const fillVar = tokenVar(node.fill, importNames);
    if (fillVar) {
      lines.push(varName + ".fills = mf(" + fillVar + ");");
    }
  }

  emitVisibility(node, varName, lines);

  // Rule 1 + Rule 12: append → FILL → textAutoResize LAST
  lines.push(parentVar + ".appendChild(" + varName + ");");
  emitFillSizing(node, varName, lines);

  // Rule 12: textAutoResize AFTER append and FILL
  const autoResize = node.autoResize ?? "HEIGHT";
  lines.push(varName + ".textAutoResize = " + JSON.stringify(autoResize) + ";");

  // Truncation
  if (node.maxLines != null) {
    lines.push(varName + ".maxLines = " + node.maxLines + ";");
    lines.push(varName + '.textTruncation = "ENDING";');
  }

  emitAbsolute(node, varName, lines);
}

function emitInstance(
  node: ResolvedNode,
  parentVar: string,
  varName: string,
  importNames: Map<string, string>,
  lines: string[],
): void {
  const comp = node._resolvedComponent;
  if (!comp) {
    lines.push('// WARN: unresolved component "' + (node.component ?? "?") + '"');
    return;
  }

  const compVar = importNames.get(comp.key);
  if (!compVar) {
    lines.push('// WARN: no import found for component "' + comp.name + '"');
    return;
  }

  if (comp.type === "COMPONENT_SET" || comp.importMethod === "importComponentSetByKeyAsync") {
    // Build variant find expression
    if (node.variant && Object.keys(node.variant).length > 0) {
      const variantParts = Object.keys(node.variant).map(
        (k) => k + "=" + node.variant![k],
      );
      const findExpr = variantParts.join(", ");
      lines.push(
        "var target_" +
          varName +
          " = " +
          compVar +
          ".findChild(function(n) { return n.name === " +
          JSON.stringify(findExpr) +
          "; });",
      );
      lines.push(
        "var " +
          varName +
          " = (target_" +
          varName +
          " || " +
          compVar +
          ".defaultVariant).createInstance();",
      );
    } else {
      lines.push("var " + varName + " = " + compVar + ".defaultVariant.createInstance();");
    }
  } else {
    lines.push("var " + varName + " = " + compVar + ".createInstance();");
  }

  lines.push(varName + ".name = " + JSON.stringify(node.name ?? "Instance") + ";");

  emitVisibility(node, varName, lines);

  lines.push(parentVar + ".appendChild(" + varName + ");");
  emitFillSizing(node, varName, lines);

  emitAbsolute(node, varName, lines);

  // Rule 9/10: property overrides via findPropKey
  if (node.properties && Object.keys(node.properties).length > 0) {
    const compSetVar =
      comp.type === "COMPONENT_SET" || comp.importMethod === "importComponentSetByKeyAsync"
        ? compVar
        : null;
    emitPropertyOverrides(node.properties, varName, compSetVar, lines);
  }

  // Rule 9d: instance swaps
  if (node._resolvedSwaps) {
    emitInstanceSwaps(node._resolvedSwaps, varName, importNames, lines);
  }
}

function emitClone(
  node: ResolvedNode,
  parentVar: string,
  varName: string,
  importNames: Map<string, string>,
  lines: string[],
  localRefs: Map<string, string>,
): void {
  // Rule 22: clone pattern
  if (node.sourceRef && localRefs.has(node.sourceRef)) {
    const srcVar = localRefs.get(node.sourceRef)!;
    lines.push("var " + varName + " = " + srcVar + ".clone();");
  } else if (node.sourceNodeId) {
    const srcVar = "src_" + varName;
    lines.push(
      "var " + srcVar + " = await figma.getNodeByIdAsync(" + JSON.stringify(node.sourceNodeId) + ");",
    );
    lines.push("var " + varName + " = " + srcVar + ".clone();");
  } else {
    lines.push("// WARN: CLONE node has no source");
    return;
  }

  lines.push(varName + ".name = " + JSON.stringify(node.name ?? "Clone") + ";");

  emitVisibility(node, varName, lines);

  lines.push(parentVar + ".appendChild(" + varName + ");");
  emitFillSizing(node, varName, lines);

  emitAbsolute(node, varName, lines);

  if (node.overrides && node.overrides.length > 0) {
    emitCloneOverrides(node.overrides, varName, importNames, lines);
  }
}

function emitRectangle(
  node: ResolvedNode,
  parentVar: string,
  varName: string,
  importNames: Map<string, string>,
  lines: string[],
): void {
  lines.push("var " + varName + " = figma.createRectangle();");
  lines.push(varName + ".name = " + JSON.stringify(node.name ?? "Rectangle") + ";");

  if (node.width != null || node.height != null) {
    const w = node.width != null ? node.width : 100;
    const h = node.height != null ? node.height : 100;
    lines.push(varName + ".resize(" + w + ", " + h + ");");
  }

  if (node.fill) {
    const fillVar = tokenVar(node.fill, importNames);
    if (fillVar) {
      lines.push(varName + ".fills = mf(" + fillVar + ");");
    }
  }

  emitRadius(node, varName, importNames, lines);
  emitStroke(node, varName, importNames, lines);
  emitVisibility(node, varName, lines);

  lines.push(parentVar + ".appendChild(" + varName + ");");
  emitFillSizing(node, varName, lines);

  emitAbsolute(node, varName, lines);
}

function emitEllipse(
  node: ResolvedNode,
  parentVar: string,
  varName: string,
  importNames: Map<string, string>,
  lines: string[],
): void {
  lines.push("var " + varName + " = figma.createEllipse();");
  lines.push(varName + ".name = " + JSON.stringify(node.name ?? "Ellipse") + ";");

  if (node.width != null || node.height != null) {
    const w = node.width != null ? node.width : 100;
    const h = node.height != null ? node.height : 100;
    lines.push(varName + ".resize(" + w + ", " + h + ");");
  }

  if (node.fill) {
    const fillVar = tokenVar(node.fill, importNames);
    if (fillVar) {
      lines.push(varName + ".fills = mf(" + fillVar + ");");
    }
  }

  emitStroke(node, varName, importNames, lines);
  emitVisibility(node, varName, lines);

  lines.push(parentVar + ".appendChild(" + varName + ");");
  emitFillSizing(node, varName, lines);

  emitAbsolute(node, varName, lines);
}

// ---------------------------------------------------------------------------
// SHARED EMITTERS
// ---------------------------------------------------------------------------

function emitFillSizing(node: ResolvedNode, varName: string, lines: string[]): void {
  if (node.fillH) {
    lines.push(varName + '.layoutSizingHorizontal = "FILL";');
  }
  if (node.fillV) {
    lines.push(varName + '.layoutSizingVertical = "FILL";');
  }
}

function emitAbsolute(node: ResolvedNode, varName: string, lines: string[]): void {
  if (node.absolute) {
    lines.push(varName + '.layoutPositioning = "ABSOLUTE";');
    if (node.absolute.x != null) {
      lines.push(varName + ".x = " + node.absolute.x + ";");
    }
    if (node.absolute.y != null) {
      lines.push(varName + ".y = " + node.absolute.y + ";");
    }
  }
}

function emitVisibility(node: ResolvedNode, varName: string, lines: string[]): void {
  if (node.visible === false) {
    lines.push(varName + ".visible = false;");
  }
  if (node.opacity != null && node.opacity !== 1) {
    lines.push(varName + ".opacity = " + node.opacity + ";");
  }
}

function emitPadding(
  node: ResolvedNode,
  varName: string,
  importNames: Map<string, string>,
  lines: string[],
): void {
  // Shorthand: padding → all four sides
  if (node.padding) {
    const pVar = tokenVar(node.padding, importNames);
    if (pVar) {
      lines.push(
        "bindPadding(" + varName + ", " + pVar + ", " + pVar + ", " + pVar + ", " + pVar + ");",
      );
      return;
    }
  }

  const top = node.paddingTop ? tokenVar(node.paddingTop, importNames) : null;
  const right = node.paddingRight ? tokenVar(node.paddingRight, importNames) : null;
  const bottom = node.paddingBottom ? tokenVar(node.paddingBottom, importNames) : null;
  const left = node.paddingLeft ? tokenVar(node.paddingLeft, importNames) : null;

  if (top || right || bottom || left) {
    lines.push(
      "bindPadding(" +
        varName +
        ", " +
        (top ?? "null") +
        ", " +
        (right ?? "null") +
        ", " +
        (bottom ?? "null") +
        ", " +
        (left ?? "null") +
        ");",
    );
  }
}

function emitRadius(
  node: ResolvedNode,
  varName: string,
  importNames: Map<string, string>,
  lines: string[],
): void {
  if (node.radius) {
    const rVar = tokenVar(node.radius, importNames);
    if (rVar) {
      lines.push("bindRadius(" + varName + ", " + rVar + ");");
      return;
    }
  }

  const tl = node.radiusTopLeft ? tokenVar(node.radiusTopLeft, importNames) : null;
  const tr = node.radiusTopRight ? tokenVar(node.radiusTopRight, importNames) : null;
  const bl = node.radiusBottomLeft ? tokenVar(node.radiusBottomLeft, importNames) : null;
  const br = node.radiusBottomRight ? tokenVar(node.radiusBottomRight, importNames) : null;

  if (tl) lines.push(varName + '.setBoundVariable("topLeftRadius", ' + tl + ");");
  if (tr) lines.push(varName + '.setBoundVariable("topRightRadius", ' + tr + ");");
  if (bl) lines.push(varName + '.setBoundVariable("bottomLeftRadius", ' + bl + ");");
  if (br) lines.push(varName + '.setBoundVariable("bottomRightRadius", ' + br + ");");
}

function emitStroke(
  node: ResolvedNode,
  varName: string,
  importNames: Map<string, string>,
  lines: string[],
): void {
  if (!node.stroke) return;

  const strokeVar = tokenVar(node.stroke, importNames);
  if (!strokeVar) return;

  lines.push(varName + ".strokes = mf(" + strokeVar + ");");
  lines.push(varName + ".strokeWeight = " + (node.strokeWeight ?? 1) + ";");
  lines.push(varName + ".strokeAlign = " + JSON.stringify(node.strokeAlign ?? "INSIDE") + ";");
}

function emitPropertyOverrides(
  properties: Record<string, unknown>,
  instVar: string,
  compSetVar: string | null,
  lines: string[],
): void {
  const keys = Object.keys(properties);
  if (!keys.length) return;

  if (compSetVar) {
    for (const propName of keys) {
      const value = properties[propName];
      const propType = typeof value === "boolean" ? "BOOLEAN" : "TEXT";
      const valStr = typeof value === "boolean" ? String(value) : JSON.stringify(value);
      const keyVar = "k_" + propName.replace(/[^a-zA-Z0-9]/g, "_");
      lines.push(
        "var " +
          keyVar +
          " = findPropKey(" +
          compSetVar +
          ", " +
          JSON.stringify(propName) +
          ", " +
          JSON.stringify(propType) +
          ");",
      );
      lines.push(
        "if (" +
          keyVar +
          ") " +
          instVar +
          ".setProperties({ [" +
          keyVar +
          "]: " +
          valStr +
          " });",
      );
    }
  } else {
    const propsObj: Record<string, unknown> = {};
    for (const propName of keys) {
      propsObj[propName] = properties[propName];
    }
    lines.push(instVar + ".setProperties(" + JSON.stringify(propsObj) + ");");
  }
}

function emitInstanceSwaps(
  resolvedSwaps: Record<string, ResolvedToken>,
  instVar: string,
  importNames: Map<string, string>,
  lines: string[],
): void {
  const keys = Object.keys(resolvedSwaps);
  for (const slotName of keys) {
    const swap = resolvedSwaps[slotName]!;
    const swapCompVar = importNames.get(swap.key);
    if (!swapCompVar) continue;

    const slotKeyVar = "sk_" + slotName.replace(/[^a-zA-Z0-9]/g, "_");
    lines.push(
      "var " +
        slotKeyVar +
        " = findPropKey(" +
        instVar +
        ", " +
        JSON.stringify(slotName) +
        ', "INSTANCE_SWAP");',
    );
    lines.push(
      "if (" +
        slotKeyVar +
        ") " +
        instVar +
        ".setProperties({ [" +
        slotKeyVar +
        "]: " +
        swapCompVar +
        ".id });",
    );
  }
}

function emitCloneOverrides(
  overrides: readonly CloneOverride[],
  cloneVar: string,
  importNames: Map<string, string>,
  lines: string[],
): void {
  for (let i = 0; i < overrides.length; i++) {
    const ov = overrides[i]!;
    const find = ov.find;
    const set = ov.set;
    if (!find || !set) continue;

    const ovVar = "ov_" + i + "_" + cloneVar;
    const findParts: string[] = ["n.name === " + JSON.stringify(find.name)];
    if (find.type) {
      findParts.push("n.type === " + JSON.stringify(find.type));
    }
    lines.push(
      "var " +
        ovVar +
        " = " +
        cloneVar +
        ".findOne(function(n) { return " +
        findParts.join(" && ") +
        "; });",
    );

    const guard = "if (" + ovVar + ") ";

    if (set.characters != null) {
      lines.push(guard + ovVar + ".characters = " + JSON.stringify(set.characters) + ";");
    }
    if (set.fill) {
      const fillVar = tokenVar(set.fill, importNames);
      if (fillVar) {
        lines.push(guard + ovVar + ".fills = mf(" + fillVar + ");");
      }
    }
    if (set.visible != null) {
      lines.push(guard + ovVar + ".visible = " + (set.visible ? "true" : "false") + ";");
    }
    if (set.properties) {
      const propStr = JSON.stringify(set.properties);
      lines.push(guard + ovVar + ".setProperties(" + propStr + ");");
    }
  }
}

// ---------------------------------------------------------------------------
// TREE WALKER
// ---------------------------------------------------------------------------

function walkAndEmit(
  nodes: readonly ResolvedNode[] | undefined,
  parentVar: string,
  importNames: Map<string, string>,
  counters: Map<string, number>,
  localRefs: Map<string, string>,
  lines: string[],
): void {
  if (!Array.isArray(nodes)) return;

  for (const node of nodes) {
    if (!node || !node.type) continue;

    const varName = safeNodeVar(node.type, node.name, counters);

    if (node.id) {
      localRefs.set(node.id, varName);
    }

    switch (node.type) {
      case "FRAME":
        emitFrame(node, parentVar, varName, importNames, lines);
        if (Array.isArray(node.children) && node.children.length > 0) {
          walkAndEmit(node.children, varName, importNames, counters, localRefs, lines);
        }
        break;

      case "TEXT":
        emitText(node, parentVar, varName, importNames, lines);
        break;

      case "INSTANCE":
        emitInstance(node, parentVar, varName, importNames, lines);
        // Rule 14: no children on instances
        break;

      case "CLONE":
        emitClone(node, parentVar, varName, importNames, lines, localRefs);
        break;

      case "RECTANGLE":
        emitRectangle(node, parentVar, varName, importNames, lines);
        break;

      case "ELLIPSE":
        emitEllipse(node, parentVar, varName, importNames, lines);
        break;

      default:
        lines.push('// WARN: unknown node type "' + String(node.type) + '"');
        break;
    }

    lines.push(""); // blank line between nodes
  }
}

// ---------------------------------------------------------------------------
// PRELOAD CHUNK EMITTER
// ---------------------------------------------------------------------------

export interface CodegenContext {
  transport?: string;
  isMultiChunk?: boolean;
  rootName?: string;
  rootWidth?: number;
  rootHeight?: number;
  allImports?: ImportBundle;
}

function emitPreloadChunk(chunk: Chunk, context: CodegenContext): string {
  const lines: string[] = [];
  const importNames = new Map<string, string>();

  lines.push("// ── PRELOAD ──");
  lines.push("globalThis.__bridge = {};");
  lines.push("");

  const importCode = emitImports(chunk.imports, importNames, "");
  if (importCode) {
    lines.push("// ── IMPORTS ──");
    lines.push(importCode);
    lines.push("");
  }

  lines.push("// ── STORE ON BRIDGE ──");
  importNames.forEach((varName) => {
    lines.push("globalThis.__bridge." + varName + " = " + varName + ";");
  });
  lines.push("");

  // Create root frame (Rule 19)
  const rootName = context.rootName ?? "Root";
  const rootWidth = context.rootWidth ?? 1440;
  const rootHeight = context.rootHeight ?? 900;

  lines.push("// ── ROOT FRAME ──");
  lines.push("var root = figma.createFrame();");
  lines.push("root.name = " + JSON.stringify(rootName) + ";");
  lines.push("root.resize(" + rootWidth + ", " + rootHeight + ");");
  lines.push('root.layoutMode = "VERTICAL";');
  lines.push('root.primaryAxisSizingMode = "AUTO";');
  lines.push('root.counterAxisSizingMode = "FIXED";');
  lines.push("root.x = 0;");
  lines.push("root.y = 0;");
  lines.push("figma.currentPage.appendChild(root);");
  lines.push("globalThis.__bridge.root = root;");

  return lines.join("\n");
}

function emitBuildChunk(chunk: Chunk, context: CodegenContext): string {
  const lines: string[] = [];
  const importNames = new Map<string, string>();
  const counters = new Map<string, number>();
  const localRefs = new Map<string, string>();

  lines.push("// ── BUILD CHUNK " + chunk.index + " ──");
  lines.push("var b = globalThis.__bridge;");
  lines.push("var root = b.root;");
  lines.push("");

  // Reconstruct the import variable names from context.allImports.
  if (context.allImports) {
    const allImps = context.allImports;
    const vars = allImps.variables ?? [];
    const comps = allImps.components ?? [];
    const styles = allImps.textStyles ?? [];

    for (const v of vars) {
      const vn = importVarName(v, importNames);
      lines.push("var " + vn + " = b." + vn + ";");
    }
    for (const c of comps) {
      const vn = importVarName(c, importNames);
      lines.push("var " + vn + " = b." + vn + ";");
    }
    for (const s of styles) {
      const vn = importVarName(s, importNames);
      lines.push("var " + vn + " = b." + vn + ";");
    }
    lines.push("");
  }

  lines.push("// ── NODES ──");
  walkAndEmit(chunk.nodes, "root", importNames, counters, localRefs, lines);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// SINGLE CHUNK EMITTER
// ---------------------------------------------------------------------------

function emitSingleChunk(chunk: Chunk, context: CodegenContext): string {
  const lines: string[] = [];
  const importNames = new Map<string, string>();
  const counters = new Map<string, number>();
  const localRefs = new Map<string, string>();

  const importCode = emitImports(chunk.imports, importNames, "");
  if (importCode) {
    lines.push("// ── IMPORTS ──");
    lines.push(importCode);
    lines.push("");
  }

  const rootName = context.rootName ?? "Root";
  const rootWidth = context.rootWidth ?? 1440;
  const rootHeight = context.rootHeight ?? 900;

  lines.push("// ── ROOT ──");
  lines.push("var root = figma.createFrame();");
  lines.push("root.name = " + JSON.stringify(rootName) + ";");
  lines.push("root.resize(" + rootWidth + ", " + rootHeight + ");");
  lines.push('root.layoutMode = "VERTICAL";');
  lines.push('root.primaryAxisSizingMode = "AUTO";');
  lines.push('root.counterAxisSizingMode = "FIXED";');
  lines.push("root.x = 0;");
  lines.push("root.y = 0;");
  lines.push("figma.currentPage.appendChild(root);");
  lines.push("");

  lines.push("// ── BUILD ──");
  walkAndEmit(chunk.nodes, "root", importNames, counters, localRefs, lines);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

/**
 * Generate Figma Plugin API JavaScript code from a resolved chunk.
 */
export function generateCode(chunk: Chunk, context?: CodegenContext): string {
  const ctx = context ?? {};

  if (ctx.isMultiChunk && chunk.label === "preload") {
    return emitPreloadChunk(chunk, ctx);
  }

  if (ctx.isMultiChunk && chunk.label !== "preload") {
    return emitBuildChunk(chunk, ctx);
  }

  return emitSingleChunk(chunk, ctx);
}
