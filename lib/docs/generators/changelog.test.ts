// lib/docs/generators/changelog.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateChangelogDoc } from "./changelog.js";

test("renders a per-component changelog", async () => {
  const md = await generateChangelogDoc({
    component: "Button",
    entries: [
      {
        date: "2026-04-15T00:00:00Z",
        version: "1.0.0",
        changes: [{ type: "Added", description: "initial" }],
      },
    ],
  });
  assert.match(md, /# Button — Changelog/);
  assert.match(md, /- Added: initial/);
});
