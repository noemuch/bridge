// lib/lint/coverage.ts
import type { Category } from "@noemuch/bridge-ds-rule-api";
import type { CoverageReport, RuleDef, LintDiagnostic } from "./types.js";

const ALL_CATEGORIES: Category[] = [
  "tokens",
  "structure",
  "naming",
  "typography",
  "workflow",
  "copy",
  "interaction",
];

interface ComputeOpts {
  rules: Record<string, RuleDef>;
  diagnostics: readonly LintDiagnostic[];
}

export function computeCoverage(opts: ComputeOpts): CoverageReport {
  const byCategory = Object.fromEntries(
    ALL_CATEGORIES.map((c) => [c, { passed: 0, failed: 0, total: 0 }])
  ) as Record<Category, { passed: number; failed: number; total: number }>;

  const failedRuleIds = new Set(opts.diagnostics.map((d) => d.ruleId));

  for (const [id, rule] of Object.entries(opts.rules)) {
    const cat = rule.meta.category;
    byCategory[cat].total += 1;
    if (failedRuleIds.has(id)) byCategory[cat].failed += 1;
    else byCategory[cat].passed += 1;
  }

  const overall = ALL_CATEGORIES.reduce(
    (acc, c) => ({
      passed: acc.passed + byCategory[c].passed,
      failed: acc.failed + byCategory[c].failed,
      total: acc.total + byCategory[c].total,
    }),
    { passed: 0, failed: 0, total: 0 }
  );

  return { byCategory, overall };
}

export function renderCoverage(report: CoverageReport): string {
  const lines: string[] = [];
  lines.push("Bridge KB coverage:");
  lines.push("");
  for (const cat of ALL_CATEGORIES) {
    const r = report.byCategory[cat];
    if (r.total === 0) continue;
    const pct = Math.round((r.passed / r.total) * 100);
    const bar = "█".repeat(Math.round(pct / 5)).padEnd(20, "░");
    lines.push(
      `  ${cat.padEnd(14)} ${bar} ${pct.toString().padStart(3)}%  ${r.passed}/${r.total}`
    );
  }
  lines.push("");
  const overallPct = report.overall.total
    ? Math.round((report.overall.passed / report.overall.total) * 100)
    : 0;
  lines.push(
    `  TOTAL          ${"█".repeat(Math.round(overallPct / 5)).padEnd(20, "░")} ${overallPct
      .toString()
      .padStart(3)}%  ${report.overall.passed}/${report.overall.total}`
  );
  return lines.join("\n");
}
