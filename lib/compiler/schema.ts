// ---------------------------------------------------------------------------
// schema.ts — Stage 1: schema validation + shorthand expansion
// ---------------------------------------------------------------------------

import { CompilerError } from "./errors.js";
import type { NodeType, SceneGraph, SceneNode } from "./types.js";

// ─── Node Types ───────────────────────────────────────────────────────────────

export const NODE_TYPES: readonly NodeType[] = [
  "FRAME",
  "TEXT",
  "INSTANCE",
  "CLONE",
  "RECTANGLE",
  "ELLIPSE",
  "REPEAT",
  "CONDITIONAL",
];

// ─── Allowed enum values ──────────────────────────────────────────────────────

const LAYOUT_MODES: readonly string[] = ["HORIZONTAL", "VERTICAL", "NONE"];
const SIZING_MODES: readonly string[] = ["AUTO", "FIXED"];
const PRIMARY_AXIS_ALIGNS: readonly string[] = ["MIN", "CENTER", "MAX", "SPACE_BETWEEN"];
const COUNTER_AXIS_ALIGNS: readonly string[] = ["MIN", "CENTER", "MAX"];
const STROKE_ALIGNS: readonly string[] = ["INSIDE", "OUTSIDE", "CENTER"];
const AUTO_RESIZE_MODES: readonly string[] = ["HEIGHT", "WIDTH_AND_HEIGHT", "NONE"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Narrow unknown to a plain object record. */
function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Indexed access to an arbitrary object-like value. */
function field(obj: unknown, key: string): unknown {
  return isObject(obj) ? obj[key] : undefined;
}

function missingField(fieldName: string, nodeName: string, path: string): CompilerError {
  return new CompilerError("PARSE_MISSING_FIELD", {
    message: 'Missing required field "' + fieldName + '" on node "' + nodeName + '"',
    node: nodeName,
    path: path + "." + fieldName,
  });
}

function unknownType(
  type: string,
  nodeName: string | undefined,
  path: string,
): CompilerError {
  return new CompilerError("PARSE_UNKNOWN_NODE_TYPE", {
    message:
      'Unknown node type "' +
      type +
      '"' +
      (nodeName ? ' on node "' + nodeName + '"' : ""),
    node: nodeName ?? "(unnamed)",
    path: path + ".type",
  });
}

function invalidEnum(
  fieldName: string,
  value: unknown,
  allowed: readonly string[],
  nodeName: string,
  path: string,
): CompilerError {
  return new CompilerError("PARSE_MISSING_FIELD", {
    message:
      'Invalid value "' +
      String(value) +
      '" for "' +
      fieldName +
      '" on node "' +
      nodeName +
      '". Allowed: ' +
      allowed.join(", "),
    node: nodeName,
    path: path + "." + fieldName,
  });
}

function checkEnum(
  fieldName: string,
  value: unknown,
  allowed: readonly string[],
  nodeName: string,
  path: string,
): CompilerError | null {
  if (value !== undefined && allowed.indexOf(value as string) === -1) {
    return invalidEnum(fieldName, value, allowed, nodeName, path);
  }
  return null;
}

function checkString(
  fieldName: string,
  value: unknown,
  nodeName: string,
  path: string,
): CompilerError | null {
  if (value !== undefined && typeof value !== "string") {
    return new CompilerError("PARSE_MISSING_FIELD", {
      message: 'Field "' + fieldName + '" must be a string on node "' + nodeName + '"',
      node: nodeName,
      path: path + "." + fieldName,
    });
  }
  return null;
}

function checkNumber(
  fieldName: string,
  value: unknown,
  nodeName: string,
  path: string,
): CompilerError | null {
  if (value !== undefined && typeof value !== "number") {
    return new CompilerError("PARSE_MISSING_FIELD", {
      message: 'Field "' + fieldName + '" must be a number on node "' + nodeName + '"',
      node: nodeName,
      path: path + "." + fieldName,
    });
  }
  return null;
}

function checkBoolean(
  fieldName: string,
  value: unknown,
  nodeName: string,
  path: string,
): CompilerError | null {
  if (value !== undefined && typeof value !== "boolean") {
    return new CompilerError("PARSE_MISSING_FIELD", {
      message: 'Field "' + fieldName + '" must be a boolean on node "' + nodeName + '"',
      node: nodeName,
      path: path + "." + fieldName,
    });
  }
  return null;
}

// ─── Shorthand Expansion ──────────────────────────────────────────────────────

/**
 * Expand shorthands and apply defaults to a node (mutates the node).
 */
function expandShorthands(node: Record<string, unknown>): Record<string, unknown> {
  // Padding shorthand: padding → all four sides
  if (node["padding"] !== undefined) {
    if (node["paddingTop"] === undefined) node["paddingTop"] = node["padding"];
    if (node["paddingRight"] === undefined) node["paddingRight"] = node["padding"];
    if (node["paddingBottom"] === undefined) node["paddingBottom"] = node["padding"];
    if (node["paddingLeft"] === undefined) node["paddingLeft"] = node["padding"];
    delete node["padding"];
  }

  // Default visible = true
  if (node["visible"] === undefined) {
    node["visible"] = true;
  }

  // Default strokeAlign = "INSIDE" when stroke is present
  if (node["stroke"] !== undefined && node["strokeAlign"] === undefined) {
    node["strokeAlign"] = "INSIDE";
  }

  // Default autoResize = "HEIGHT" for TEXT nodes
  if (node["type"] === "TEXT" && node["autoResize"] === undefined) {
    node["autoResize"] = "HEIGHT";
  }

  return node;
}

// ─── Per-Type Validators ──────────────────────────────────────────────────────

type RawNode = Record<string, unknown>;

function validateFrame(node: RawNode, path: string): CompilerError[] {
  const errors: CompilerError[] = [];
  const name = String(node["name"] ?? "");

  const enumChecks: Array<[string, readonly string[]]> = [
    ["layout", LAYOUT_MODES],
    ["primaryAxisSizing", SIZING_MODES],
    ["counterAxisSizing", SIZING_MODES],
    ["primaryAxisAlign", PRIMARY_AXIS_ALIGNS],
    ["counterAxisAlign", COUNTER_AXIS_ALIGNS],
    ["strokeAlign", STROKE_ALIGNS],
  ];
  for (const [f, allowed] of enumChecks) {
    const e = checkEnum(f, node[f], allowed, name, path);
    if (e) errors.push(e);
  }

  const numFields = ["width", "height", "strokeWeight", "opacity"];
  for (const f of numFields) {
    const e = checkNumber(f, node[f], name, path);
    if (e) errors.push(e);
  }

  const strFields = [
    "gap",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "radius",
    "radiusTopLeft",
    "radiusTopRight",
    "radiusBottomLeft",
    "radiusBottomRight",
    "fill",
    "stroke",
    "effectStyle",
  ];
  for (const f of strFields) {
    const e = checkString(f, node[f], name, path);
    if (e) errors.push(e);
  }

  const boolFields = ["clip", "fillH", "fillV"];
  for (const f of boolFields) {
    const e = checkBoolean(f, node[f], name, path);
    if (e) errors.push(e);
  }

  // Recurse into children
  const children = node["children"];
  if (Array.isArray(children)) {
    children.forEach((child: unknown, i: number) => {
      const childErrors = validateNode(child, path + ".children[" + i + "]");
      for (const ce of childErrors) errors.push(ce);
    });
  }

  return errors;
}

function validateText(node: RawNode, path: string): CompilerError[] {
  const errors: CompilerError[] = [];
  const name = String(node["name"] ?? "");

  const characters = node["characters"];
  if (characters === undefined || characters === null) {
    errors.push(missingField("characters", name, path));
  } else if (typeof characters !== "string") {
    errors.push(
      new CompilerError("PARSE_MISSING_FIELD", {
        message: 'Field "characters" must be a string on node "' + name + '"',
        node: name,
        path: path + ".characters",
      }),
    );
  }

  if (!node["textStyle"]) {
    errors.push(missingField("textStyle", name, path));
  } else {
    const e = checkString("textStyle", node["textStyle"], name, path);
    if (e) errors.push(e);
  }

  const e1 = checkEnum("autoResize", node["autoResize"], AUTO_RESIZE_MODES, name, path);
  if (e1) errors.push(e1);

  const e2 = checkString("fill", node["fill"], name, path);
  if (e2) errors.push(e2);

  const e3 = checkNumber("maxLines", node["maxLines"], name, path);
  if (e3) errors.push(e3);

  return errors;
}

function validateInstance(node: RawNode, path: string): CompilerError[] {
  const errors: CompilerError[] = [];
  const name = String(node["name"] ?? "");

  if (!node["component"]) {
    errors.push(missingField("component", name, path));
  } else {
    const e = checkString("component", node["component"], name, path);
    if (e) errors.push(e);
  }

  if (node["variant"] !== undefined && !isObject(node["variant"])) {
    errors.push(
      new CompilerError("PARSE_MISSING_FIELD", {
        message: 'Field "variant" must be an object on node "' + name + '"',
        node: name,
        path: path + ".variant",
      }),
    );
  }

  if (node["properties"] !== undefined && !isObject(node["properties"])) {
    errors.push(
      new CompilerError("PARSE_MISSING_FIELD", {
        message: 'Field "properties" must be an object on node "' + name + '"',
        node: name,
        path: path + ".properties",
      }),
    );
  }

  if (node["swaps"] !== undefined && !isObject(node["swaps"])) {
    errors.push(
      new CompilerError("PARSE_MISSING_FIELD", {
        message: 'Field "swaps" must be an object on node "' + name + '"',
        node: name,
        path: path + ".swaps",
      }),
    );
  }

  return errors;
}

function validateClone(node: RawNode, path: string): CompilerError[] {
  const errors: CompilerError[] = [];
  const name = String(node["name"] ?? "");

  if (!node["sourceNodeId"] && !node["sourceRef"]) {
    errors.push(
      new CompilerError("PARSE_MISSING_FIELD", {
        message:
          'CLONE node "' + name + '" must have either "sourceNodeId" or "sourceRef"',
        node: name,
        path: path,
      }),
    );
  }

  const overrides = node["overrides"];
  if (overrides !== undefined) {
    if (!Array.isArray(overrides)) {
      errors.push(
        new CompilerError("PARSE_MISSING_FIELD", {
          message: 'Field "overrides" must be an array on node "' + name + '"',
          node: name,
          path: path + ".overrides",
        }),
      );
    } else {
      overrides.forEach((override: unknown, i: number) => {
        const oPath = path + ".overrides[" + i + "]";
        const find = field(override, "find");
        if (!find || !field(find, "name")) {
          errors.push(
            new CompilerError("PARSE_MISSING_FIELD", {
              message: "Override at " + oPath + ' must have "find.name"',
              node: name,
              path: oPath + ".find.name",
            }),
          );
        }
        const set = field(override, "set");
        if (!set || !isObject(set)) {
          errors.push(
            new CompilerError("PARSE_MISSING_FIELD", {
              message: "Override at " + oPath + ' must have a "set" object',
              node: name,
              path: oPath + ".set",
            }),
          );
        }
      });
    }
  }

  return errors;
}

function validateRectangle(node: RawNode, path: string): CompilerError[] {
  const errors: CompilerError[] = [];
  const name = String(node["name"] ?? "");

  if (node["width"] === undefined) errors.push(missingField("width", name, path));
  if (node["height"] === undefined) errors.push(missingField("height", name, path));

  const numFields = ["width", "height", "strokeWeight"];
  for (const f of numFields) {
    const e = checkNumber(f, node[f], name, path);
    if (e) errors.push(e);
  }

  const strFields = ["fill", "stroke", "radius"];
  for (const f of strFields) {
    const e = checkString(f, node[f], name, path);
    if (e) errors.push(e);
  }

  const e = checkEnum("strokeAlign", node["strokeAlign"], STROKE_ALIGNS, name, path);
  if (e) errors.push(e);

  return errors;
}

function validateEllipse(node: RawNode, path: string): CompilerError[] {
  const errors: CompilerError[] = [];
  const name = String(node["name"] ?? "");

  if (node["width"] === undefined) errors.push(missingField("width", name, path));
  if (node["height"] === undefined) errors.push(missingField("height", name, path));

  const numFields = ["width", "height", "strokeWeight"];
  for (const f of numFields) {
    const e = checkNumber(f, node[f], name, path);
    if (e) errors.push(e);
  }

  const strFields = ["fill", "stroke"];
  for (const f of strFields) {
    const e = checkString(f, node[f], name, path);
    if (e) errors.push(e);
  }

  return errors;
}

function validateRepeat(node: RawNode, path: string): CompilerError[] {
  const errors: CompilerError[] = [];
  const name = String(node["name"] ?? "");

  if (node["count"] === undefined && node["data"] === undefined) {
    errors.push(
      new CompilerError("PARSE_MISSING_FIELD", {
        message: 'REPEAT node "' + name + '" must have either "count" or "data"',
        node: name,
        path: path,
      }),
    );
  }

  if (node["count"] !== undefined) {
    const e = checkNumber("count", node["count"], name, path);
    if (e) errors.push(e);
  }

  if (node["data"] !== undefined && !Array.isArray(node["data"])) {
    errors.push(
      new CompilerError("PARSE_MISSING_FIELD", {
        message: 'Field "data" must be an array on node "' + name + '"',
        node: name,
        path: path + ".data",
      }),
    );
  }

  const template = node["template"];
  if (!template || !Array.isArray(template) || template.length === 0) {
    errors.push(missingField("template", name, path));
  } else {
    template.forEach((child: unknown, i: number) => {
      const childErrors = validateNode(child, path + ".template[" + i + "]");
      for (const ce of childErrors) errors.push(ce);
    });
  }

  return errors;
}

function validateConditional(node: RawNode, path: string): CompilerError[] {
  const errors: CompilerError[] = [];
  const name = String(node["name"] ?? "");

  if (!node["when"]) {
    errors.push(missingField("when", name, path));
  } else {
    const e = checkString("when", node["when"], name, path);
    if (e) errors.push(e);
  }

  const children = node["children"];
  if (!children || !Array.isArray(children) || children.length === 0) {
    errors.push(missingField("children", name, path));
  } else {
    children.forEach((child: unknown, i: number) => {
      const childErrors = validateNode(child, path + ".children[" + i + "]");
      for (const ce of childErrors) errors.push(ce);
    });
  }

  const elseBranch = node["else"];
  if (elseBranch !== undefined) {
    if (!Array.isArray(elseBranch)) {
      errors.push(
        new CompilerError("PARSE_MISSING_FIELD", {
          message: 'Field "else" must be an array on node "' + name + '"',
          node: name,
          path: path + ".else",
        }),
      );
    } else {
      elseBranch.forEach((child: unknown, i: number) => {
        const childErrors = validateNode(child, path + ".else[" + i + "]");
        for (const ce of childErrors) errors.push(ce);
      });
    }
  }

  return errors;
}

// ─── Node Dispatcher ──────────────────────────────────────────────────────────

type TypeValidator = (node: RawNode, path: string) => CompilerError[];

const TYPE_VALIDATORS: Record<NodeType, TypeValidator> = {
  FRAME: validateFrame,
  TEXT: validateText,
  INSTANCE: validateInstance,
  CLONE: validateClone,
  RECTANGLE: validateRectangle,
  ELLIPSE: validateEllipse,
  REPEAT: validateRepeat,
  CONDITIONAL: validateConditional,
};

/**
 * Validate a single node: check common fields, dispatch to type-specific validator.
 */
function validateNode(node: unknown, path: string): CompilerError[] {
  const errors: CompilerError[] = [];

  if (!isObject(node)) {
    errors.push(
      new CompilerError("PARSE_MISSING_FIELD", {
        message: "Node at " + path + " must be an object",
        node: "(invalid)",
        path: path,
      }),
    );
    return errors;
  }

  const raw = node as RawNode;
  const rawType = raw["type"];
  const rawName = typeof raw["name"] === "string" ? (raw["name"] as string) : undefined;

  if (!rawType) {
    errors.push(missingField("type", rawName ?? "(unnamed)", path));
    return errors;
  }

  if (typeof rawType !== "string" || (NODE_TYPES as readonly string[]).indexOf(rawType) === -1) {
    errors.push(unknownType(String(rawType), rawName, path));
    return errors;
  }

  if (!rawName) {
    errors.push(missingField("name", "(unnamed)", path));
  }

  // Expand shorthands and apply defaults before type-specific validation
  expandShorthands(raw);

  const displayName = rawName ?? "(unnamed)";

  // Common optional field checks
  const e1 = checkBoolean("visible", raw["visible"], displayName, path);
  if (e1) errors.push(e1);
  const e2 = checkNumber("opacity", raw["opacity"], displayName, path);
  if (e2) errors.push(e2);
  const e3 = checkBoolean("fillH", raw["fillH"], displayName, path);
  if (e3) errors.push(e3);
  const e4 = checkBoolean("fillV", raw["fillV"], displayName, path);
  if (e4) errors.push(e4);

  // Dispatch to type-specific validator
  const typeValidator = TYPE_VALIDATORS[rawType as NodeType];
  const typeErrors = typeValidator(raw, path);
  for (const te of typeErrors) errors.push(te);

  return errors;
}

// ─── Root Validator ───────────────────────────────────────────────────────────

export interface SchemaValidationResult {
  valid: boolean;
  errors: CompilerError[];
  graph: SceneGraph | null;
}

/**
 * Validate a complete scene graph JSON document.
 */
export function validateSceneGraph(json: unknown): SchemaValidationResult {
  const errors: CompilerError[] = [];

  // Must be an object
  if (!isObject(json)) {
    errors.push(
      new CompilerError("PARSE_INVALID_JSON", {
        message: "Scene graph must be a JSON object",
        node: null,
        path: "",
      }),
    );
    return { valid: false, errors, graph: null };
  }

  const root = json as Record<string, unknown>;

  // version
  if (root["version"] !== "3.0") {
    errors.push(
      new CompilerError("PARSE_MISSING_FIELD", {
        message:
          'Scene graph must have version "3.0", got "' + String(root["version"]) + '"',
        node: null,
        path: "version",
      }),
    );
  }

  // metadata
  const metadata = root["metadata"];
  if (!isObject(metadata)) {
    errors.push(
      new CompilerError("PARSE_MISSING_FIELD", {
        message: 'Scene graph must have a "metadata" object',
        node: null,
        path: "metadata",
      }),
    );
  } else {
    if (!metadata["name"]) {
      errors.push(
        new CompilerError("PARSE_MISSING_FIELD", {
          message: "metadata.name is required",
          node: null,
          path: "metadata.name",
        }),
      );
    }
    if (typeof metadata["width"] !== "number") {
      errors.push(
        new CompilerError("PARSE_MISSING_FIELD", {
          message: "metadata.width is required and must be a number",
          node: null,
          path: "metadata.width",
        }),
      );
    }
    if (typeof metadata["height"] !== "number") {
      errors.push(
        new CompilerError("PARSE_MISSING_FIELD", {
          message: "metadata.height is required and must be a number",
          node: null,
          path: "metadata.height",
        }),
      );
    }
  }

  // fonts
  const fonts = root["fonts"];
  if (!Array.isArray(fonts)) {
    errors.push(
      new CompilerError("PARSE_MISSING_FIELD", {
        message: 'Scene graph must have a "fonts" array',
        node: null,
        path: "fonts",
      }),
    );
  } else {
    fonts.forEach((font: unknown, i: number) => {
      const family = field(font, "family");
      const style = field(font, "style");
      if (!family || typeof family !== "string") {
        errors.push(
          new CompilerError("PARSE_MISSING_FIELD", {
            message: "fonts[" + i + "].family is required and must be a string",
            node: null,
            path: "fonts[" + i + "].family",
          }),
        );
      }
      if (!style || typeof style !== "string") {
        errors.push(
          new CompilerError("PARSE_MISSING_FIELD", {
            message: "fonts[" + i + "].style is required and must be a string",
            node: null,
            path: "fonts[" + i + "].style",
          }),
        );
      }
    });
  }

  // nodes
  const nodes = root["nodes"];
  if (!Array.isArray(nodes)) {
    errors.push(
      new CompilerError("PARSE_MISSING_FIELD", {
        message: 'Scene graph must have a "nodes" array',
        node: null,
        path: "nodes",
      }),
    );
  } else {
    nodes.forEach((node: unknown, i: number) => {
      const nodeErrors = validateNode(node, "nodes[" + i + "]");
      for (const ne of nodeErrors) errors.push(ne);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    graph: errors.length === 0 ? (json as unknown as SceneGraph) : null,
  };
}

// Re-export node types for convenience
export type { SceneNode, SceneGraph };
