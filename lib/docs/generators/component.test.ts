// lib/docs/generators/component.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateComponentDoc } from "./component.js";
import { buildFromScratch } from "../../kb/index-builder.js";

test("generateComponentDoc renders frontmatter + all sections", async () => {
  const kb = buildFromScratch({
    components: {
      version: 1,
      generatedAt: "now",
      components: [
        {
          key: "k1",
          name: "Button",
          category: "actions",
          status: "stable",
          variants: [],
          properties: [],
        },
      ],
    },
    variables: { version: 1, generatedAt: "now", variables: [] },
    textStyles: { version: 1, generatedAt: "now", styles: [] },
    learnings: { learnings: [], flags: [] },
    recipes: { recipes: [] },
  });
  const entry = kb.componentIndex.Button;
  const md = await generateComponentDoc({
    entry: { ...entry, name: "Button" },
    docs: {
      whenToUse: ["Primary action"],
      whenNotToUse: ["Navigation"],
      do: [{ rule: "One primary", source: "learning#8" }],
      dont: [{ rule: "Multiple primaries", source: "learning#3" }],
      accessibility: ["Enter activates"],
    },
    index: kb,
    kbVersion: "3.2.0",
    registriesHash: "sha256:test",
  });
  assert.match(md, /^---/m);
  assert.match(md, /^# Button$/m);
  assert.match(md, /## When to use/);
  assert.match(md, /## Props/);
  assert.match(md, /## Do/);
  assert.match(md, /## Don't/);
});

test("generateComponentDoc preserves manual regions on regen", async () => {
  const kb = buildFromScratch({
    components: {
      version: 1,
      generatedAt: "now",
      components: [
        {
          key: "k1",
          name: "Button",
          category: "actions",
          status: "stable",
          variants: [],
          properties: [],
        },
      ],
    },
    variables: { version: 1, generatedAt: "now", variables: [] },
    textStyles: { version: 1, generatedAt: "now", styles: [] },
    learnings: { learnings: [], flags: [] },
    recipes: { recipes: [] },
  });
  const existing = `## When to use

<!-- manual:when-to-use-Button -->
Hand-written guidance.
<!-- /manual:when-to-use-Button -->

Other text.`;

  const md = await generateComponentDoc({
    entry: { ...kb.componentIndex.Button, name: "Button" },
    docs: { whenToUse: ["Auto-generated"] },
    index: kb,
    kbVersion: "3.2.0",
    registriesHash: "sha256:test",
    existingMd: existing,
  });
  assert.match(md, /Hand-written guidance\./);
});
