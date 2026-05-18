import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadRegistry } from "./registry.js";
import { resolveTokenRef } from "./resolve.js";

// Variables in the Finary KB are namespaced under their collection
// (e.g. `layout/spacing/medium`, `layout/radius/medium`). The scoring
// system used to give equal weight to a match-via-name-only ("medium")
// and a match-with-category ("radius/medium"), and broke ties by
// insertion order — so `$radius/medium` resolved to `layout/spacing/medium`
// whenever the spacing entry appeared first. This test locks in the fix:
// segments that include the category MUST win over name-only matches.

function fixture(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "bridge-cat-bias-"));
  const regDir = path.join(dir, "knowledge-base", "registries");
  mkdirSync(regDir, { recursive: true });
  writeFileSync(path.join(regDir, "components.json"), JSON.stringify({ version: 1, components: [] }));
  writeFileSync(
    path.join(regDir, "variables.json"),
    JSON.stringify({
      version: 1,
      variables: [
        // Order matters: spacing/medium comes first, so a category-blind
        // tiebreak would pick it for both $spacing/medium and $radius/medium.
        { name: "layout/spacing/medium", key: "spacing_med_key" },
        { name: "layout/radius/medium", key: "radius_med_key" },
      ],
    })
  );
  writeFileSync(path.join(regDir, "text-styles.json"), JSON.stringify({ styles: [] }));
  return dir;
}

test("resolveTokenRef picks the category-matching variable, not the first-inserted one", () => {
  const dir = fixture();
  try {
    const reg = loadRegistry(dir);
    const spacing = resolveTokenRef("$spacing/medium", reg);
    const radius = resolveTokenRef("$radius/medium", reg);
    assert.equal(spacing.error, null);
    assert.equal(radius.error, null);
    assert.equal(spacing.resolved?.key, "spacing_med_key");
    assert.equal(radius.resolved?.key, "radius_med_key");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
