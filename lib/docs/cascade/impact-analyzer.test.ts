// lib/docs/cascade/impact-analyzer.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeImpact } from "./impact-analyzer.js";

const idx: any = {
  version: "3.2.0",
  generatedAt: "now",
  tokenIndex: {
    "$color/bg/primary": { category: "color", key: "v1", usedBy: ["Button", "Card"] },
  },
  componentIndex: {
    Button: { category: "actions", status: "stable", key: "k1", uses: { tokens: ["$color/bg/primary"], components: [] }, usedBy: [], alternatives: [], composesWith: [], supersedes: [], deprecatedBy: null },
    Card:   { category: "surface", status: "stable", key: "k2", uses: { tokens: ["$color/bg/primary"], components: [] }, usedBy: [], alternatives: [], composesWith: [], supersedes: [], deprecatedBy: null },
  },
  learningIndex: {},
  patternIndex: {
    "form-submit": { components: ["Button"], recipes: ["r-1"] },
  },
};

test("token modification cascades to components using it", () => {
  const impact = computeImpact({
    components: { added: [], modified: [], removed: [], renamed: [] },
    variables:  { added: [], modified: ["color/bg/primary"], removed: [], renamed: [] },
    textStyles: { added: [], modified: [], removed: [], renamed: [] },
  }, idx);
  assert.deepEqual(impact.componentsToRegen.sort(), ["Button", "Card"]);
  assert.ok(impact.foundationsToRegen.includes("color"));
  assert.ok(impact.patternsToRegen.includes("form-submit"));
});

test("component rename emits migration guide", () => {
  const impact = computeImpact({
    components: { added: [], modified: [], removed: [], renamed: [{ from: "Button", to: "ButtonNew" }] },
    variables: { added: [], modified: [], removed: [], renamed: [] },
    textStyles: { added: [], modified: [], removed: [], renamed: [] },
  }, idx);
  assert.equal(impact.migrations.length, 1);
  assert.equal(impact.migrations[0].reason, "component-rename");
  assert.equal(impact.migrations[0].from, "Button");
  assert.equal(impact.migrations[0].to, "ButtonNew");
});

test("token rename emits migration + regens consumers", () => {
  const impact = computeImpact({
    components: { added: [], modified: [], removed: [], renamed: [] },
    variables: { added: [], modified: [], removed: [], renamed: [{ from: "color/bg/primary", to: "color/brand/primary" }] },
    textStyles: { added: [], modified: [], removed: [], renamed: [] },
  }, idx);
  assert.equal(impact.migrations.length, 1);
  assert.equal(impact.migrations[0].reason, "token-rename");
  assert.ok(impact.componentsToRegen.includes("Button"));
  assert.ok(impact.componentsToRegen.includes("Card"));
});

test("no changes produces empty impact", () => {
  const impact = computeImpact({
    components: { added: [], modified: [], removed: [], renamed: [] },
    variables: { added: [], modified: [], removed: [], renamed: [] },
    textStyles: { added: [], modified: [], removed: [], renamed: [] },
  }, idx);
  assert.deepEqual(impact.componentsToRegen, []);
  assert.deepEqual(impact.migrations, []);
});
