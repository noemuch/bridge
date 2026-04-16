import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFromScratch } from "./index-builder.js";

const FIX_COMPONENTS = {
  version: 1,
  generatedAt: "2026-04-15T10:00:00Z",
  components: [
    {
      key: "k1",
      name: "Button",
      category: "actions" as const,
      status: "stable" as const,
      variants: [],
      properties: [],
    },
    {
      key: "k2",
      name: "Link",
      category: "actions" as const,
      status: "stable" as const,
      variants: [],
      properties: [],
    },
  ],
};
const FIX_VARIABLES = {
  version: 1,
  generatedAt: "2026-04-15T10:00:00Z",
  variables: [
    {
      key: "v1",
      name: "color/bg/primary",
      resolvedType: "COLOR" as const,
      valuesByMode: { light: {}, dark: {} },
    },
  ],
};
const FIX_TEXT_STYLES = { version: 1, generatedAt: "2026-04-15T10:00:00Z", styles: [] };

test("buildFromScratch produces valid _index.json structure", () => {
  const idx = buildFromScratch({
    components: FIX_COMPONENTS,
    variables: FIX_VARIABLES,
    textStyles: FIX_TEXT_STYLES,
    learnings: { learnings: [], flags: [] },
    recipes: { recipes: [] },
  });
  assert.equal(idx.version, "3.2.0");
  assert.ok(idx.generatedAt);
  assert.ok(idx.tokenIndex["$color/bg/primary"]);
  assert.ok(idx.componentIndex.Button);
  assert.equal(idx.componentIndex.Button.category, "actions");
  assert.deepEqual(idx.learningIndex, {});
});

test("componentIndex has expected empty arrays", () => {
  const idx = buildFromScratch({
    components: FIX_COMPONENTS,
    variables: FIX_VARIABLES,
    textStyles: FIX_TEXT_STYLES,
    learnings: { learnings: [], flags: [] },
    recipes: { recipes: [] },
  });
  assert.ok(Array.isArray(idx.componentIndex.Button.uses.tokens));
  assert.equal(idx.componentIndex.Button.alternatives.length, 0);
});
