// lib/docs/generators/foundation.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateFoundationDoc } from "./foundation.js";

test("foundation doc renders color foundation", async () => {
  const md = await generateFoundationDoc({
    category: "color", title: "Color", summary: "Semantic color tokens.",
    tokens: [{ name: "bg/primary", light: "#0066FF", dark: "#3385FF", scopes: ["ALL_FILLS"] }],
  });
  assert.match(md, /^# Color$/m);
  assert.match(md, /\| `bg\/primary` \| #0066FF \| #3385FF \| ALL_FILLS \|/);
});
