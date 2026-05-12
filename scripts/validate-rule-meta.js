#!/usr/bin/env node
// scripts/validate-rule-meta.js
// CI gate: every built-in rule has the required meta fields.
const { readdirSync, readFileSync } = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");

const ROOT = path.resolve(__dirname, "../lib/lint/builtin");
const CATEGORIES = [
  "tokens",
  "structure",
  "naming",
  "typography",
  "workflow",
  "copy",
  "interaction",
];
const SURFACES = ["compile-time", "lint-time", "skill-overlay"];
const STATUSES = ["canary", "active", "deprecated"];

let errors = 0;
for (const catDir of readdirSync(ROOT, { withFileTypes: true })) {
  if (!catDir.isDirectory() || catDir.name.startsWith("_")) continue;
  for (const ruleEntry of readdirSync(path.join(ROOT, catDir.name), {
    withFileTypes: true,
  })) {
    if (!ruleEntry.isDirectory()) continue;
    const yamlPath = path.join(ROOT, catDir.name, ruleEntry.name, "rule.yaml");
    let parsed;
    try {
      parsed = yaml.load(readFileSync(yamlPath, "utf-8"));
    } catch {
      console.error(`✗ ${ruleEntry.name}: cannot read ${yamlPath}`);
      errors += 1;
      continue;
    }
    const [id, rule] = Object.entries(parsed.rules)[0];
    const meta = rule.meta ?? {};
    const issues = [];
    if (!meta.bridgeApi) issues.push("missing bridgeApi");
    if (!CATEGORIES.includes(meta.category))
      issues.push(`bad category: ${meta.category}`);
    if (!Array.isArray(meta.surface) || meta.surface.length === 0)
      issues.push("missing/empty surface");
    for (const s of meta.surface ?? []) {
      if (!SURFACES.includes(s)) issues.push(`bad surface: ${s}`);
    }
    if (!STATUSES.includes(meta.status)) issues.push(`bad status: ${meta.status}`);
    if (meta.surface?.includes("skill-overlay")) {
      if (!meta.rationale) issues.push("skill-overlay surface needs rationale");
      if (!meta.example) issues.push("skill-overlay surface needs example");
    }
    if (!meta.since) issues.push("missing since");
    if (issues.length > 0) {
      console.error(
        `✗ ${id} (${path.relative(ROOT, yamlPath)}): ${issues.join(", ")}`
      );
      errors += issues.length;
    }
  }
}
if (errors > 0) {
  console.error(`\n${errors} validation error(s)`);
  process.exit(1);
}
console.log("All rules have required meta fields ✓");
