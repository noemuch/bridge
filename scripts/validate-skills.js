#!/usr/bin/env node
/* eslint-disable */
// Skill manifest validator — run as part of `prepublishOnly` and CI.
// Auto-discovers skills under skills/*/SKILL.md so new skills drop in without
// editing this script. The only skill-specific rule is that `using-bridge` is
// a process skill and does not carry the action-skill section scheme.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(ROOT, "skills");

const ACTION_SKILL_SECTIONS = [
  "## Overview",
  "## When to Use",
  "## Procedure",
  "## Red Flags",
  "## Verification",
];

const REQUIRED_REFERENCES = [
  "references/compiler-reference.md",
  "references/transport-adapter.md",
  "references/verification-gates.md",
  "references/red-flags-catalog.md",
];

// Paths that used to exist in older skill layouts. Any occurrence in current
// skill markdown is a dead link, so we fail the build on sight.
const DEAD_PATHS = [
  "references/actions/make.md",
  "references/actions/fix.md",
  "references/actions/done.md",
  "references/actions/setup.md",
  "references/actions/drop.md",
  "skills/design-workflow/",
];

const failures = [];
const fail = (msg) => failures.push(msg);

function parseFrontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const obj = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (kv) obj[kv[1]] = kv[2].trim();
  }
  return obj;
}

function discoverSkills() {
  if (!fs.existsSync(SKILLS_DIR)) {
    fail(`Missing skills/ directory at ${SKILLS_DIR}`);
    return [];
  }
  return fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

const skills = discoverSkills();
if (skills.length === 0) fail("No skills discovered under skills/");

for (const skill of skills) {
  const p = path.join(SKILLS_DIR, skill, "SKILL.md");
  if (!fs.existsSync(p)) {
    fail(`Missing SKILL.md for ${skill}`);
    continue;
  }
  const src = fs.readFileSync(p, "utf8");
  const fm = parseFrontmatter(src);
  if (!fm) {
    fail(`${skill}: missing frontmatter`);
    continue;
  }
  if (fm.name !== skill) fail(`${skill}: frontmatter name "${fm.name}" != directory "${skill}"`);
  if (!fm.description) fail(`${skill}: missing description`);
  // Action skills carry the procedure scheme; process skills (using-bridge)
  // are shorter by design.
  if (skill !== "using-bridge") {
    for (const section of ACTION_SKILL_SECTIONS) {
      if (!src.includes(section)) fail(`${skill}: missing section "${section}"`);
    }
  }
  for (const dead of DEAD_PATHS) {
    if (src.includes(dead)) fail(`${skill}: references deprecated path "${dead}"`);
  }
}

for (const ref of REQUIRED_REFERENCES) {
  const p = path.join(ROOT, ref);
  if (!fs.existsSync(p)) fail(`Missing reference: ${ref}`);
}

if (failures.length) {
  console.error("Skill validation FAILED:");
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log(
  `OK — ${skills.length} skill(s) (${skills.join(", ")}), ${REQUIRED_REFERENCES.length} reference(s).`
);
