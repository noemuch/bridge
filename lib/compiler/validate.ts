// ---------------------------------------------------------------------------
// validate.ts — Stage 3: Structural validation (post-resolution)
// ---------------------------------------------------------------------------

import { CompilerError } from "./errors.js";
import type { Registry } from "./registry.js";
import type { ResolvedNode, ResolvedSceneGraph } from "./types.js";

// ---------------------------------------------------------------------------
// INTERNAL HELPERS
// ---------------------------------------------------------------------------

type WalkCallback = (node: ResolvedNode, parent: ResolvedNode | null, path: string) => void;

function walkWithParent(
  nodes: readonly ResolvedNode[] | null | undefined,
  callback: WalkCallback,
  parent: ResolvedNode | null,
  path: string,
): void {
  if (!nodes || !nodes.length) return;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const nodePath = path + "[" + i + "]";
    callback(node, parent, nodePath);
    if (Array.isArray(node.children)) {
      walkWithParent(node.children, callback, node, nodePath + ".children");
    }
  }
}

function isFormComponent(name: string | undefined): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  return lower.includes("input") || lower.includes("select");
}

function hasRealValues(properties: Record<string, unknown> | undefined): boolean {
  if (!properties) return false;
  const placeholders = [
    "label",
    "placeholder",
    "text",
    "value",
    "title",
    "hint",
    "helper",
    "description",
    "name",
    "input",
  ];
  const entries = Object.entries(properties);
  for (const [, val] of entries) {
    if (typeof val !== "string") continue;
    if (val.length <= 3) continue;
    if (placeholders.indexOf(val.toLowerCase()) !== -1) continue;
    return true;
  }
  return false;
}

function collectIds(nodes: readonly ResolvedNode[] | undefined, ids: Set<string>): void {
  if (!nodes) return;
  for (const node of nodes) {
    if (node.id) ids.add(node.id);
    if (Array.isArray(node.children)) collectIds(node.children, ids);
  }
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  errors: CompilerError[];
  warnings: CompilerError[];
}

/**
 * Validate a resolved scene graph for structural correctness.
 */
export function validate(graph: ResolvedSceneGraph, registry: Registry | null): ValidationResult {
  const errors: CompilerError[] = [];
  const warnings: CompilerError[] = [];
  const nodes = graph.nodes ?? [];

  // Pre-compute set of all local IDs for orphan-clone check
  const allIds = new Set<string>();
  collectIds(nodes, allIds);

  // Component name set (lowercase) for Rule 18
  const componentNames = registry?.components?.byName ?? new Map();

  walkWithParent(
    nodes,
    (node, parent, path) => {
      // ------------------------------------------------------------------
      // Rule 3 — FILL child inside AUTO-sized parent
      // ------------------------------------------------------------------
      if (parent && (node.fillH || node.fillV)) {
        const layout = parent.layout ?? "NONE";

        if (layout === "VERTICAL") {
          if (node.fillV && parent.primaryAxisSizing === "AUTO") {
            errors.push(
              new CompilerError("VALIDATE_FILL_IN_AUTO_PARENT", {
                message:
                  "fillV child inside VERTICAL parent with primaryAxisSizing AUTO collapses to 0px",
                node: node.name ?? null,
                path: path + ".fillV",
              }),
            );
          }
          if (node.fillH && parent.counterAxisSizing === "AUTO") {
            errors.push(
              new CompilerError("VALIDATE_FILL_IN_AUTO_PARENT", {
                message:
                  "fillH child inside VERTICAL parent with counterAxisSizing AUTO collapses to 0px",
                node: node.name ?? null,
                path: path + ".fillH",
              }),
            );
          }
        }

        if (layout === "HORIZONTAL") {
          if (node.fillH && parent.primaryAxisSizing === "AUTO") {
            errors.push(
              new CompilerError("VALIDATE_FILL_IN_AUTO_PARENT", {
                message:
                  "fillH child inside HORIZONTAL parent with primaryAxisSizing AUTO collapses to 0px",
                node: node.name ?? null,
                path: path + ".fillH",
              }),
            );
          }
          if (node.fillV && parent.counterAxisSizing === "AUTO") {
            errors.push(
              new CompilerError("VALIDATE_FILL_IN_AUTO_PARENT", {
                message:
                  "fillV child inside HORIZONTAL parent with counterAxisSizing AUTO collapses to 0px",
                node: node.name ?? null,
                path: path + ".fillV",
              }),
            );
          }
        }
      }

      // ------------------------------------------------------------------
      // Rule 14 — INSTANCE with children
      // ------------------------------------------------------------------
      if (
        node.type === "INSTANCE" &&
        Array.isArray(node.children) &&
        node.children.length > 0
      ) {
        errors.push(
          new CompilerError("VALIDATE_INSTANCE_HAS_CHILDREN", {
            node: node.name ?? null,
            path: path + ".children",
          }),
        );
      }

      // ------------------------------------------------------------------
      // Rule 18 — Raw shape matching DS component
      // ------------------------------------------------------------------
      if ((node.type === "RECTANGLE" || node.type === "ELLIPSE") && node.name) {
        const lower = node.name.toLowerCase();
        if (componentNames.has(lower)) {
          const match = componentNames.get(lower)!;
          warnings.push(
            new CompilerError("VALIDATE_RAW_SHAPE_HAS_DS_MATCH", {
              message:
                "Raw " +
                node.type +
                ' "' +
                node.name +
                '" matches DS component "' +
                match.name +
                '" — consider using INSTANCE instead',
              node: node.name,
              path: path,
              suggestion: [match.name],
            }),
          );
        }
      }

      // ------------------------------------------------------------------
      // Rule 25 — Form component without filled state
      // ------------------------------------------------------------------
      if (node.type === "INSTANCE" && isFormComponent(node.component)) {
        const hasFilledState =
          node.variant !== undefined &&
          (node.variant as Record<string, string>)["state"] === "filled";
        if (!hasFilledState && hasRealValues(node.properties)) {
          warnings.push(
            new CompilerError("VALIDATE_FORM_NO_FILLED_STATE", {
              message:
                'Form component "' +
                (node.component ?? node.name) +
                '" has real values but no state:"filled" variant — input will appear empty',
              node: node.name ?? null,
              path: path + ".variant",
            }),
          );
        }
      }

      // ------------------------------------------------------------------
      // TEXT without textStyle
      // ------------------------------------------------------------------
      if (node.type === "TEXT") {
        if (!node.textStyle || typeof node.textStyle === "string") {
          errors.push(
            new CompilerError("VALIDATE_TEXT_NO_STYLE", {
              node: node.name ?? null,
              path: path + ".textStyle",
            }),
          );
        }
      }

      // ------------------------------------------------------------------
      // Orphan CLONE
      // ------------------------------------------------------------------
      if (node.type === "CLONE" && node.sourceRef) {
        if (!allIds.has(node.sourceRef)) {
          warnings.push(
            new CompilerError("VALIDATE_ORPHAN_CLONE", {
              message:
                'CLONE sourceRef "' +
                node.sourceRef +
                '" has no matching node id in the graph',
              node: node.name ?? null,
              path: path + ".sourceRef",
            }),
          );
        }
      }
    },
    null,
    "nodes",
  );

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
