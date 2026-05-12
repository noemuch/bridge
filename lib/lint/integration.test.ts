import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadConfig } from "./loader.js";
import { runRulesAgainstDocument } from "./engine.js";
import type { RuleDef } from "./types.js";

test("integration: load yaml config + run on document end-to-end", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "bridge-lint-int-"));
  await writeFile(
    path.join(dir, "config.yaml"),
    `
rules:
  no-hex:
    description: "Forbid hex literals"
    given: "$..fill"
    then:
      function: pattern
      functionOptions: { notMatch: "^#" }
    severity: error
    meta:
      bridgeApi: "1.x"
      category: tokens
      surface: [compile-time, lint-time]
      status: active
      since: "1.0.0"
`
  );

  const config = await loadConfig(path.join(dir, "config.yaml"));
  assert.ok(config?.rules);

  const compileRules: Record<string, RuleDef> = {};
  for (const [id, r] of Object.entries(config.rules)) {
    if (r === "off") continue;
    compileRules[id] = { ...r, id };
  }

  // Document that violates
  const violating = { fill: "#fff" };
  const r1 = await runRulesAgainstDocument(
    { rules: compileRules },
    violating,
    { source: "test" }
  );
  assert.equal(r1.diagnostics.length, 1);
  assert.equal(r1.diagnostics[0].ruleId, "no-hex");

  // Document that passes
  const passing = { fill: "$color/background/surface/subtle" };
  const r2 = await runRulesAgainstDocument(
    { rules: compileRules },
    passing,
    { source: "test" }
  );
  assert.equal(r2.diagnostics.length, 0);
});
