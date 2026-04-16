// lib/docs/preservation.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractRegions, mergeRegions } from "./preservation.js";

const existing = `# Button

## When to use

<!-- manual:when-to-use-Button -->
Custom guidance written by a human.
<!-- /manual:when-to-use-Button -->

Regen content below.`;

test("extractRegions extracts a single region", () => {
  const regions = extractRegions(existing);
  assert.equal(regions["when-to-use-Button"].trim(), "Custom guidance written by a human.");
});

test("mergeRegions reinjects content into fresh render", () => {
  const fresh = `# Button\n\n## When to use\n\n<!-- manual:when-to-use-Button -->\n<!-- /manual:when-to-use-Button -->\n\nNew content.`;
  const merged = mergeRegions(fresh, {
    "when-to-use-Button": "Custom guidance written by a human.",
  });
  assert.match(merged, /Custom guidance written by a human\./);
});

test("mergeRegions warns on orphans", () => {
  const fresh = `# Button\nNew content without marker.`;
  const merged = mergeRegions(fresh, { "orphan-id": "lost content" });
  assert.match(merged, /WARNING: orphaned manual region "orphan-id"/);
  assert.match(merged, /lost content/);
});

test("extractRegions returns empty object for no markers", () => {
  assert.deepEqual(extractRegions("# No markers here"), {});
});
