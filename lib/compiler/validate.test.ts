import { test } from "node:test";
import assert from "node:assert/strict";
import { validate } from "./validate.js";
import type { ResolvedSceneGraph } from "./types.js";

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
