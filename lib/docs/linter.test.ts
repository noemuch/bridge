// lib/docs/linter.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { lintDoc } from "./linter.js";

test("lintDoc flags missing required frontmatter field", () => {
  const md = `---\ncategory: actions\n---\n\n# X\n`;
  const res = lintDoc({ path: "X.md", content: md, kind: "component", tokenIndex: {} });
  assert.ok(res.issues.some((i) => i.code === "frontmatter.required" && i.field === "name"));
});

test("lintDoc flags unresolved token ref", () => {
  const md = `---\nname: X\ncategory: actions\nstatus: stable\nlast-regenerated: 2026-04-15T10:00:00Z\n---\n\n# X\n\nUses \`$color/bg/nonexistent\`.`;
  const res = lintDoc({
    path: "X.md",
    content: md,
    kind: "component",
    tokenIndex: { "$color/bg/primary": {} },
  });
  assert.ok(res.issues.some((i) => i.code === "token.unresolved"));
});

test("lintDoc passes clean doc", () => {
  const md = `---\nname: X\ncategory: actions\nstatus: stable\nlast-regenerated: 2026-04-15T10:00:00Z\n---\n\n# X\n`;
  const res = lintDoc({ path: "X.md", content: md, kind: "component", tokenIndex: {} });
  assert.deepEqual(res.issues, []);
});

test("lintDoc flags figma link without node-id", () => {
  const md = `---\nname: X\ncategory: actions\nstatus: stable\nlast-regenerated: 2026-04-15T10:00:00Z\n---\n\nSee https://figma.com/file/abc123/DS`;
  const res = lintDoc({ path: "X.md", content: md, kind: "component", tokenIndex: {} });
  assert.ok(res.issues.some((i) => i.code === "figma.deeplink.shape"));
});

test("lintDoc flags missing frontmatter entirely", () => {
  const res = lintDoc({
    path: "X.md",
    content: "# X\nNo frontmatter",
    kind: "component",
    tokenIndex: {},
  });
  assert.ok(res.issues.some((i) => i.code === "frontmatter.missing"));
});
