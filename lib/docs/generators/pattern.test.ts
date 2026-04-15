// lib/docs/generators/pattern.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { generatePatternDoc } from "./pattern.js";

test("pattern renders components list", async () => {
  const md = await generatePatternDoc({
    name: "form-submit", title: "Form submit", description: "Submit a form.",
    components: ["Input", "Button"], recipes: [],
  });
  assert.match(md, /^# Form submit$/m);
  assert.match(md, /- \[Input\]\(\.\.\/components\/Input\.md\)/);
});
