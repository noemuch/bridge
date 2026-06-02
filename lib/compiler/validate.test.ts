import { test } from "node:test";
import assert from "node:assert/strict";
import { validate } from "./validate.js";
import type { ResolvedSceneGraph } from "./types.js";
import type { Registry } from "./registry.js";

// Build a minimal Registry whose component carries variant metadata in the
// REAL on-disk shape: variants is Array<{ name: string; values: string[] }>.
function registryWithButtonVariants(): Registry {
  const byName = new Map([
    [
      "button",
      {
        name: "Button",
        key: "abc",
        type: "COMPONENT_SET",
        properties: {},
        variants: [
          { name: "variant", values: ["primary", "secondary", "ghost", "danger"] },
          { name: "size", values: ["sm", "md", "lg"] },
        ],
      },
    ],
  ]);
  return {
    variables: { byName: new Map(), bySegment: new Map() },
    components: { byName },
    textStyles: { byName: new Map(), bySegment: new Map() },
    icons: { byName: new Map() },
    logos: { byName: new Map() },
    allVariableNames: [],
    allComponentNames: ["button"],
    allStyleNames: [],
  } as unknown as Registry;
}

// Same as above but the component has NO variant metadata (no-op case).
function registryWithoutVariants(): Registry {
  const byName = new Map([
    ["button", { name: "Button", key: "abc", type: "COMPONENT", properties: {} }],
  ]);
  return {
    variables: { byName: new Map(), bySegment: new Map() },
    components: { byName },
    textStyles: { byName: new Map(), bySegment: new Map() },
    icons: { byName: new Map() },
    logos: { byName: new Map() },
    allVariableNames: [],
    allComponentNames: ["button"],
    allStyleNames: [],
  } as unknown as Registry;
}

test("top-level fillV is flagged against the synthetic AUTO root", () => {
  const graph = {
    nodes: [{ type: "FRAME", name: "Banner", layout: "VERTICAL", fillV: true }],
  } as unknown as ResolvedSceneGraph;

  const result = validate(graph, null);
  const codes = result.errors.map((e) => e.code);
  assert.ok(
    codes.includes("VALIDATE_FILL_IN_AUTO_PARENT"),
    "expected VALIDATE_FILL_IN_AUTO_PARENT for top-level fillV, got " + codes.join(",")
  );
});

test("top-level fillH is allowed (root counter axis is FIXED)", () => {
  const graph = {
    nodes: [{ type: "FRAME", name: "Banner", layout: "VERTICAL", fillH: true }],
  } as unknown as ResolvedSceneGraph;

  const result = validate(graph, null);
  const codes = result.errors.map((e) => e.code);
  assert.ok(
    !codes.includes("VALIDATE_FILL_IN_AUTO_PARENT"),
    "top-level fillH must not be flagged"
  );
});

test("unknown variant VALUE is flagged with VALIDATE_UNKNOWN_VARIANT", () => {
  const graph = {
    nodes: [
      {
        type: "INSTANCE",
        name: "MyButton",
        component: "Button",
        variant: { variant: "primary", size: "enormous" },
      },
    ],
  } as unknown as ResolvedSceneGraph;

  const result = validate(graph, registryWithButtonVariants());
  const codes = result.warnings.map((w) => w.code);
  assert.ok(
    codes.includes("VALIDATE_UNKNOWN_VARIANT"),
    "expected VALIDATE_UNKNOWN_VARIANT for size:enormous, got " + codes.join(",")
  );
});

test("valid variant combo emits no VALIDATE_UNKNOWN_VARIANT warning", () => {
  const graph = {
    nodes: [
      {
        type: "INSTANCE",
        name: "MyButton",
        component: "Button",
        variant: { variant: "primary", size: "md" },
      },
    ],
  } as unknown as ResolvedSceneGraph;

  const result = validate(graph, registryWithButtonVariants());
  const codes = result.warnings.map((w) => w.code);
  assert.ok(
    !codes.includes("VALIDATE_UNKNOWN_VARIANT"),
    "valid variant combo must not be flagged, got " + codes.join(",")
  );
});

test("component without variant metadata is a no-op", () => {
  const graph = {
    nodes: [
      {
        type: "INSTANCE",
        name: "MyButton",
        component: "Button",
        variant: { size: "enormous" },
      },
    ],
  } as unknown as ResolvedSceneGraph;

  const result = validate(graph, registryWithoutVariants());
  const codes = result.warnings.map((w) => w.code);
  assert.ok(
    !codes.includes("VALIDATE_UNKNOWN_VARIANT"),
    "component without variant metadata must not be flagged, got " + codes.join(",")
  );
});
