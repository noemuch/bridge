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
    diagnostics: [
      { ruleId: "rule-a", category: "tokens" } as never,
    ],
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

test("renderCoverage emits per-category lines and totals for non-empty input", () => {
  const result = computeCoverage({
    rules: {
      "rule-a": { meta: { category: "tokens" } },
      "rule-b": { meta: { category: "tokens" } },
      "rule-c": { meta: { category: "naming" } },
    } as never,
    diagnostics: [
      { ruleId: "rule-a", category: "tokens" } as never,
    ],
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
