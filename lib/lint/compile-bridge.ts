// lib/lint/compile-bridge.ts
//
// Bridges the lint engine into the compiler's hot path. Called once per
// compile to run the subset of rules tagged `surface: compile-time` against
// a CSpec document.
//
// Design notes:
// - Returns an empty (zero-diagnostic) result when no config exists. This is
//   the v6 → v7 escape hatch: consumers who haven't opted into the lint
//   engine see no behavioural change.
// - Filters config to compile-time rules only. lint-time rules are handled
//   by the separate `bridge-ds lint` CLI (Task 15).
// - We pass each rule object through to the engine as-is. The engine accepts
//   `Omit<RuleDef, "id"> & { id?: string }` (RuleInput), so the id from the
//   record key is fine to leave implicit — no cast required.
import { loadConfig } from "./loader.js";
import { runRulesAgainstDocument } from "./engine.js";
import { loadCustomFunctions } from "./load-custom-functions.js";
import type { LintResult, RuleDef } from "./types.js";

function emptyResult(): LintResult {
  return {
    diagnostics: [],
    coverage: {
      byCategory: {} as never,
      overall: { passed: 0, failed: 0, total: 0 },
    },
  };
}

export async function runLintAtCompileTime(spec: unknown, configPath: string): Promise<LintResult> {
  const config = await loadConfig(configPath);
  if (!config || !config.rules) return emptyResult();

  const compileRules: Record<string, RuleDef> = {};
  for (const [id, rule] of Object.entries(config.rules)) {
    if (rule === "off") continue;
    if (rule.meta.surface.includes("compile-time")) {
      compileRules[id] = rule;
    }
  }

  if (Object.keys(compileRules).length === 0) return emptyResult();

  const customFunctions = await loadCustomFunctions(config.functionsDir);

  return runRulesAgainstDocument({ rules: compileRules }, spec, {
    source: "<cspec>",
    customFunctions,
  });
}
