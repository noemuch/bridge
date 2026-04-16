// lib/docs/cascade/diff-engine.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { diffKb, type KbSnapshot } from "./diff-engine.js";

const base: KbSnapshot = {
  components: [
    { key: "k1", name: "Button" },
    { key: "k2", name: "Link" },
  ],
  variables: [
    { key: "v1", name: "color/bg/primary", valuesByMode: { light: { r: 0, g: 0.4, b: 1 } } },
  ],
  textStyles: [],
};

test("diffKb detects added/removed", () => {
  const next = { ...base, components: [...base.components, { key: "k3", name: "Card" }] };
  const d = diffKb(base, next);
  assert.deepEqual(d.components.added, ["Card"]);
  assert.deepEqual(d.components.removed, []);
});

test("diffKb detects modified variable value", () => {
  const next = {
    ...base,
    variables: [
      { key: "v1", name: "color/bg/primary", valuesByMode: { light: { r: 0, g: 0.5, b: 1 } } },
    ],
  };
  const d = diffKb(base, next);
  assert.deepEqual(d.variables.modified, ["color/bg/primary"]);
});

test("diffKb detects rename (same key, different name)", () => {
  const next = {
    ...base,
    components: [
      { key: "k1", name: "ButtonNew" },
      { key: "k2", name: "Link" },
    ],
  };
  const d = diffKb(base, next);
  assert.deepEqual(d.components.renamed, [{ from: "Button", to: "ButtonNew" }]);
});

test("diffKb no-diff returns empty changeset", () => {
  const d = diffKb(base, base);
  assert.deepEqual(d.components.added, []);
  assert.deepEqual(d.components.modified, []);
  assert.deepEqual(d.components.renamed, []);
});
