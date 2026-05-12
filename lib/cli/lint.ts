// lib/cli/lint.ts
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { load as yamlLoad, JSON_SCHEMA } from "js-yaml";
import { loadConfig } from "../lint/loader.js";
import { runRulesAgainstDocument } from "../lint/engine.js";
import { computeCoverage, renderCoverage } from "../lint/coverage.js";
import { loadCustomFunctions } from "../lint/load-custom-functions.js";
import type { LintDiagnostic, RuleDef } from "../lint/types.js";

interface LintCliOpts {
  readonly configPath: string;
  readonly failSeverity: "warn" | "error" | "off";
  readonly coverage: boolean;
}

async function* walkCSpecs(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkCSpecs(full);
    } else if (entry.name.endsWith(".cspec.yaml")) {
      yield full;
    }
  }
}

export async function lintCommand(opts: LintCliOpts): Promise<number> {
  const config = await loadConfig(opts.configPath);
  if (!config?.rules) {
    console.log("No lint config found — nothing to check.");
    return 0;
  }

  const allRules: Record<string, RuleDef> = {};
  for (const [id, r] of Object.entries(config.rules)) {
    if (r === "off") continue;
    if ((r.meta.surface as readonly string[]).includes("lint-time")) {
      allRules[id] = { ...r, id } as RuleDef;
    }
  }

  const customFunctions = await loadCustomFunctions(config.functionsDir);

  const allDiagnostics: LintDiagnostic[] = [];
  for await (const specPath of walkCSpecs(process.cwd())) {
    const doc = yamlLoad(await readFile(specPath, "utf-8"), {
      schema: JSON_SCHEMA,
    });
    const res = await runRulesAgainstDocument({ rules: allRules }, doc, {
      source: path.relative(process.cwd(), specPath),
      customFunctions,
    });
    allDiagnostics.push(...res.diagnostics);
  }

  for (const d of allDiagnostics) {
    console.log(`  ${d.severity.padEnd(5)} ${d.source}: [${d.ruleId}] ${d.message}`);
  }

  if (opts.coverage) {
    console.log("");
    console.log(renderCoverage(computeCoverage({ rules: allRules, diagnostics: allDiagnostics })));
  }

  const severityOrder = { off: 0, hint: 1, info: 2, warn: 3, error: 4 } as const;
  const failThreshold = severityOrder[opts.failSeverity] ?? 99;
  const failedAt = allDiagnostics.find(
    (d) => severityOrder[d.severity as keyof typeof severityOrder] >= failThreshold
  );
  return failedAt ? 1 : 0;
}
