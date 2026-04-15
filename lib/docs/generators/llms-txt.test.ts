// lib/docs/generators/llms-txt.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateLlmsIndex, generateLlmsFull } from "./llms-txt.js";

test("llms.txt index renders", async () => {
  const out = await generateLlmsIndex({
    dsName: "Spectra",
    tagline: "DS.",
    components: [{ name: "Button", path: "./c/Button.md", summary: "CTA" }],
    foundations: [{ name: "Color", path: "./f/color.md", summary: "Colors" }],
  });
  assert.match(out, /# Spectra/);
  assert.match(out, /- \[Button\]\(\.\/c\/Button\.md\): CTA/);
});

test("llms-full.txt concatenates", () => {
  const out = generateLlmsFull(["# A", "# B"]);
  assert.match(out, /# A\n\n---\n\n# B/);
});
