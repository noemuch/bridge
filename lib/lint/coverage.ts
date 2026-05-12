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

const KNOWN_CATEGORIES: ReadonlySet<string> = new Set(ALL_CATEGORIES);

// Module-scoped sentinel so we warn at most once per unknown category per
// process. The lint engine can be invoked many times in a single CLI run
// (e.g. across multiple specs); spamming stderr would drown real findings.
const warnedUnknownCategories = new Set<string>();

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
    let cat = rule.meta.category as Category;
    // Defensive: a rule may declare a `meta.category` value outside the
    // canonical 7-value enum (e.g. a typo, a future category not yet
    // wired in). Without this guard `byCategory[cat]` is undefined and
    // we crash on `.total += 1`. Coerce to "structure" and warn once
    // per unknown value per process.
    if (!KNOWN_CATEGORIES.has(cat)) {
      if (!warnedUnknownCategories.has(cat)) {
        warnedUnknownCategories.add(cat);
        console.warn(
          `[bridge-ds] Rule "${id}" declares unknown meta.category "${cat}". ` +
            `Coercing to "structure" for coverage. Valid categories: ${ALL_CATEGORIES.join(", ")}.`
        );
      }
      cat = "structure";
    }
    byCategory[cat].total += 1;
    if (failedRuleIds.has(id)) byCategory[cat].failed += 1;
    else byCategory[cat].passed += 1;
  }

  const overall = ALL_CATEGORIES.reduce(
    (acc, c) => {
      // Defensive: belt-and-braces against any future code path that
      // hands us a partial byCategory map. Same fallback shape as
      // renderCoverage uses.
      const bucket = byCategory[c] ?? { passed: 0, failed: 0, total: 0 };
      return {
        passed: acc.passed + bucket.passed,
        failed: acc.failed + bucket.failed,
        total: acc.total + bucket.total,
      };
    },
    { passed: 0, failed: 0, total: 0 }
  );

  return { byCategory, overall };
}

export function renderCoverage(report: CoverageReport): string {
  const lines: string[] = [];
  lines.push("Bridge KB coverage:");
  lines.push("");
  for (const cat of ALL_CATEGORIES) {
    // Defensive fallback: a caller may hand us a partial `byCategory` map
    // (e.g. constructed in tests or by an older code path that didn't
    // initialize all 7 categories). Without the fallback we crash with
    // `Cannot read properties of undefined (reading 'total')`.
    const r = report.byCategory[cat] ?? { passed: 0, failed: 0, total: 0 };
    if (r.total === 0) continue;
    const pct = Math.round((r.passed / r.total) * 100);
    const bar = "█".repeat(Math.round(pct / 5)).padEnd(20, "░");
    lines.push(`  ${cat.padEnd(14)} ${bar} ${pct.toString().padStart(3)}%  ${r.passed}/${r.total}`);
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
