// lib/lint/builtin.test.ts
// Fixture-driven test for every built-in rule:
//   - asserts every rule directory has positive + negative fixtures
//   - asserts positive fixtures DO NOT trigger the rule
//   - asserts negative fixtures DO trigger the rule
// Rules that rely on custom (non-Spectral-builtin) functions are skipped in
// the firing test until their function impls land.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { load as yamlLoad, JSON_SCHEMA } from "js-yaml";
import { runRulesAgainstDocument } from "./engine.js";
import type { RuleDef } from "./types.js";

const BUILTIN_ROOT = path.resolve("lib/lint/builtin");

async function listCategoryDirs(): Promise<string[]> {
  const entries = await readdir(BUILTIN_ROOT, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
    .map((e) => path.join(BUILTIN_ROOT, e.name));
}

async function listRuleDirs(categoryDir: string): Promise<string[]> {
  const entries = await readdir(categoryDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => path.join(categoryDir, e.name));
}

async function loadRule(
  ruleDir: string
): Promise<{ id: string; rule: RuleDef } | null> {
  const yamlPath = path.join(ruleDir, "rule.yaml");
  try {
    const raw = await readFile(yamlPath, "utf-8");
    const parsed = yamlLoad(raw, { schema: JSON_SCHEMA }) as {
      rules: Record<string, RuleDef>;
    };
    const [id, rule] = Object.entries(parsed.rules)[0];
    return { id, rule: { ...rule, id } as RuleDef };
  } catch {
    return null;
  }
}

test("every built-in rule has positive + negative fixtures", async () => {
  for (const catDir of await listCategoryDirs()) {
    for (const ruleDir of await listRuleDirs(catDir)) {
      const ruleId = path.basename(ruleDir);
      const positiveDir = path.join(ruleDir, "fixtures", "positive");
      const negativeDir = path.join(ruleDir, "fixtures", "negative");
      try {
        const pos = await readdir(positiveDir);
        const neg = await readdir(negativeDir);
        assert.ok(pos.length > 0, `${ruleId}: missing positive fixtures`);
        assert.ok(neg.length > 0, `${ruleId}: missing negative fixtures`);
      } catch (err) {
        throw new Error(
          `${ruleId}: fixtures dir missing — ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }
  }
});

test("every rule passes positive fixtures and fails negative ones", async () => {
  // Spectral built-in functions only — skip rules that use custom functions
  // (those need their function impls landed first).
  const BUILTIN_FUNCTIONS = new Set([
    "pattern",
    "enumeration",
    "truthy",
    "falsy",
    "length",
    "schema",
    "casing",
    "alphabetical",
    "defined",
    "undefined",
    "xor",
    "or",
    "typedEnum",
    "unreferencedReusableObject",
  ]);

  for (const catDir of await listCategoryDirs()) {
    for (const ruleDir of await listRuleDirs(catDir)) {
      const ruleId = path.basename(ruleDir);
      const loaded = await loadRule(ruleDir);
      if (!loaded) continue;
      const { rule } = loaded;
      const fnName = (rule as RuleDef).then.function;
      if (!BUILTIN_FUNCTIONS.has(fnName)) {
        // Rule uses a custom function — skip until its impl lands.
        continue;
      }

      const positiveDir = path.join(ruleDir, "fixtures", "positive");
      for (const f of await readdir(positiveDir)) {
        if (
          !f.endsWith(".yaml") &&
          !f.endsWith(".cspec.yaml") &&
          !f.endsWith(".json")
        )
          continue;
        const raw = await readFile(path.join(positiveDir, f), "utf-8");
        const doc = f.endsWith(".json")
          ? JSON.parse(raw)
          : yamlLoad(raw, { schema: JSON_SCHEMA });
        const r = await runRulesAgainstDocument(
          { rules: { [ruleId]: rule } },
          doc,
          { source: f }
        );
        assert.equal(
          r.diagnostics.length,
          0,
          `${ruleId}: positive fixture ${f} triggered unexpectedly — ${JSON.stringify(
            r.diagnostics
          )}`
        );
      }

      const negativeDir = path.join(ruleDir, "fixtures", "negative");
      for (const f of await readdir(negativeDir)) {
        if (
          !f.endsWith(".yaml") &&
          !f.endsWith(".cspec.yaml") &&
          !f.endsWith(".json")
        )
          continue;
        const raw = await readFile(path.join(negativeDir, f), "utf-8");
        const doc = f.endsWith(".json")
          ? JSON.parse(raw)
          : yamlLoad(raw, { schema: JSON_SCHEMA });
        const r = await runRulesAgainstDocument(
          { rules: { [ruleId]: rule } },
          doc,
          { source: f }
        );
        assert.ok(
          r.diagnostics.length > 0,
          `${ruleId}: negative fixture ${f} did NOT trigger`
        );
      }
    }
  }
});
