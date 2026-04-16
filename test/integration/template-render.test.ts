import { test } from "node:test";
import assert from "node:assert/strict";
import { renderTemplate } from "../../lib/docs/templates/renderer.js";

test("component.md.hbs renders minimal context", async () => {
  const ctx = {
    name: "Button",
    category: "actions",
    status: "stable",
    "last-regenerated": "2026-04-15T10:00:00Z",
    "generated-from": { "kb-version": "3.2.0", "registries-hash": "sha256:abc" },
    sources: { whenToUse: "cspec.docs", whenNotToUse: "cspec.docs", accessibility: "ai-inferred" },
    whenToUse: ["Primary action in a form."],
    whenNotToUse: ["Navigation → use Link."],
    props: [{ name: "variant", type: "string", default: "primary", since: "1.0" }],
    variants: [{ name: "primary", description: "Default CTA." }],
    tokensTable: [{ token: "$color/bg/primary", light: "#0066FF", dark: "#3385FF", usage: "bg" }],
    do: [{ rule: "One primary per view", source: "learning#8" }],
    dont: [{ rule: "Multiple primaries", source: "learning#3" }],
    accessibility: ["Keyboard: Enter activates."],
  };
  const out = await renderTemplate("component.md.hbs", ctx);
  assert.match(out, /^---/m);
  assert.match(out, /^name: Button$/m);
  assert.match(out, /^# Button$/m);
  assert.match(out, /## When to use/);
  assert.match(out, /<!-- source: cspec\.docs -->/);
  assert.match(out, /<!-- manual:when-to-use-Button -->/);
  assert.match(out, /One primary per view/);
});

test("foundation.md.hbs renders", async () => {
  const out = await renderTemplate("foundation.md.hbs", {
    name: "color",
    title: "Color",
    category: "color",
    summary: "Tokens.",
    tokens: [{ name: "bg/primary", light: "#0066FF", dark: "#3385FF", scopes: ["ALL_FILLS"] }],
    "last-regenerated": "2026-04-15T10:00:00Z",
  });
  assert.match(out, /^# Color$/m);
  assert.match(out, /\| `bg\/primary` \| #0066FF \| #3385FF \| ALL_FILLS \|/);
});

test("llms.txt.hbs renders index", async () => {
  const out = await renderTemplate("llms.txt.hbs", {
    dsName: "Test DS",
    tagline: "Test tagline.",
    components: [
      { name: "Button", path: "./design-system/components/actions/Button.md", summary: "CTAs" },
    ],
    foundations: [
      { name: "Color", path: "./design-system/foundations/color.md", summary: "Colors" },
    ],
    patterns: [],
  });
  assert.match(out, /^# Test DS/m);
  assert.match(out, /- \[Button\]\(\.\/design-system\/components\/actions\/Button\.md\): CTAs/);
});
