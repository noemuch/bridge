#!/usr/bin/env node
/* eslint-disable */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REQUIRED_SKILLS = [
  'using-bridge',
  'generating-figma-design',
  'learning-from-corrections',
  'shipping-and-archiving',
  'extracting-design-system',
  'generating-ds-docs',
];
const REQUIRED_REFERENCES = [
  'references/compiler-reference.md',
  'references/transport-adapter.md',
  'references/verification-gates.md',
  'references/red-flags-catalog.md',
];
const REQUIRED_SKILL_SECTIONS = [
  '## Overview',
  '## When to Use',
  '## Procedure',
  '## Red Flags',
  '## Verification',
];
const failures = [];

function fail(msg) { failures.push(msg); }

function parseFrontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const obj = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (kv) obj[kv[1]] = kv[2].trim();
  }
  return obj;
}

// 1. Each required skill exists with valid frontmatter + required sections.
for (const skill of REQUIRED_SKILLS) {
  const p = path.join(ROOT, 'skills', skill, 'SKILL.md');
  if (!fs.existsSync(p)) {
    fail(`Missing skill: ${p}`);
    continue;
  }
  const src = fs.readFileSync(p, 'utf8');
  const fm = parseFrontmatter(src);
  if (!fm) { fail(`${skill}: no frontmatter`); continue; }
  if (fm.name !== skill) fail(`${skill}: frontmatter name "${fm.name}" != dir "${skill}"`);
  if (!fm.description) fail(`${skill}: missing description`);
  if (skill !== 'using-bridge') {
    for (const section of REQUIRED_SKILL_SECTIONS) {
      if (!src.includes(section)) fail(`${skill}: missing section "${section}"`);
    }
  }
}

// 2. Required shared references exist.
for (const ref of REQUIRED_REFERENCES) {
  const p = path.join(ROOT, ref);
  if (!fs.existsSync(p)) fail(`Missing reference: ${ref}`);
}

// v4.0.0: design-workflow shim removed (Phase 4 complete).

// 4. No broken internal links to old action paths inside new skills.
const deadPaths = [
  'references/actions/make.md',
  'references/actions/fix.md',
  'references/actions/done.md',
  'references/actions/setup.md',
  'references/actions/drop.md',
];
for (const skill of REQUIRED_SKILLS) {
  const p = path.join(ROOT, 'skills', skill, 'SKILL.md');
  if (!fs.existsSync(p)) continue;
  const src = fs.readFileSync(p, 'utf8');
  for (const dead of deadPaths) {
    if (src.includes(dead)) fail(`${skill}: references deprecated path "${dead}"`);
  }
}

if (failures.length) {
  console.error('Skill validation FAILED:');
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log(`OK — ${REQUIRED_SKILLS.length} skills, ${REQUIRED_REFERENCES.length} references, shim OK.`);
