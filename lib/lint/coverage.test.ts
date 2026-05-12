import { test } from "node:test";
import assert from "node:assert/strict";
import { computeCoverage, renderCoverage } from "./coverage.js";

test("computeCoverage groups by category", () => {
  const result = computeCoverage({
    rules: {
      "rule-a": { meta: { category: "tokens" } },
      "rule-b": { meta: { category: "tokens" } },
      "rule-c": { meta: { category: "naming" } },
    } as never,
    diagnostics: [{ ruleId: "rule-a", category: "tokens" } as never],
  });

  assert.equal(result.byCategory.tokens.total, 2);
  assert.equal(result.byCategory.tokens.failed, 1);
  assert.equal(result.byCategory.tokens.passed, 1);
  assert.equal(result.byCategory.naming.total, 1);
  assert.equal(result.byCategory.naming.failed, 0);
  assert.equal(result.byCategory.naming.passed, 1);
});

test("renderCoverage handles empty input", () => {
  const result = computeCoverage({ rules: {}, diagnostics: [] });
  const out = renderCoverage(result);
  // No category sections (all skipped because total === 0), but header + TOTAL line.
  assert.match(out, /Bridge KB coverage:/);
  assert.match(out, /TOTAL/);
  assert.match(out, /0%/);
  assert.match(out, /0\/0/);
  // None of the category labels should appear since they have 0 total.
  assert.doesNotMatch(out, /tokens\s/);
  assert.doesNotMatch(out, /naming\s/);
});

test("renderCoverage handles partial byCategory map", () => {
  const r = renderCoverage({
    byCategory: { tokens: { passed: 1, failed: 0, total: 1 } } as never,
    overall: { passed: 1, failed: 0, total: 1 },
  });
  assert.match(r, /tokens/);
  assert.match(r, /100%/);
  // Should not crash on the 6 missing categories
});

test("computeCoverage coerces unknown meta.category to 'structure' without crashing", () => {
  // Silence the one-time console.warn we expect for the unknown category so
  // it doesn't pollute test output. We assert it fired by checking call count.
  const originalWarn = console.warn;
  const warnings: string[] = [];
  console.warn = (msg: string) => {
    warnings.push(String(msg));
  };
  try {
    const result = computeCoverage({
      rules: {
        "rule-a": { meta: { category: "structure" } },
        "rule-future": { meta: { category: "future-category-not-yet-defined" } },
      } as never,
      diagnostics: [],
    });
    // The unknown-category rule should have been coerced into "structure",
    // so structure.total bumps from 1 → 2.
    assert.equal(result.byCategory.structure.total, 2);
    assert.equal(result.byCategory.structure.passed, 2);
    assert.equal(result.overall.total, 2);
    // Render must not crash either.
    const out = renderCoverage(result);
    assert.match(out, /structure/);
    // And we must have warned exactly once about the unknown category.
    assert.equal(
      warnings.filter((w) => w.includes("future-category-not-yet-defined")).length,
      1,
      "expected exactly one warning for the unknown category"
    );
  } finally {
    console.warn = originalWarn;
  }
});

test("renderCoverage emits per-category lines and totals for non-empty input", () => {
  const result = computeCoverage({
    rules: {
      "rule-a": { meta: { category: "tokens" } },
      "rule-b": { meta: { category: "tokens" } },
      "rule-c": { meta: { category: "naming" } },
    } as never,
    diagnostics: [{ ruleId: "rule-a", category: "tokens" } as never],
  });
  const out = renderCoverage(result);
  assert.match(out, /Bridge KB coverage:/);
  // tokens: 1/2 = 50%
  assert.match(out, /tokens\s+\S+\s+50%\s+1\/2/);
  // naming: 1/1 = 100%
  assert.match(out, /naming\s+\S+\s+100%\s+1\/1/);
  // TOTAL: 2/3 = 67%
  assert.match(out, /TOTAL\s+\S+\s+67%\s+2\/3/);
});
