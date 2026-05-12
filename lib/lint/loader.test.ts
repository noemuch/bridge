import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { loadConfig } from "./loader.js";

test("loadConfig parses a minimal yaml config", async () => {
  const config = await loadConfig(
    path.resolve("test/fixtures/lint/minimal-config.yaml")
  );
  assert.ok(config, "expected config to be non-null");
  assert.equal(Object.keys(config.rules ?? {}).length, 1);
  const rule = config.rules?.["test-rule"];
  assert.ok(rule && rule !== "off");
  // `assert.ok` narrows `rule` to RuleDef, so we can dereference directly.
  assert.equal(rule.severity, "warn");
  assert.equal(rule.meta.category, "structure");
});

test("loadConfig returns null when file is absent", async () => {
  const config = await loadConfig("/nonexistent/path/config.yaml");
  assert.equal(config, null);
});

test("loadConfig merges extends — child rules override parent", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "bridge-loader-"));
  await writeFile(
    path.join(dir, "parent.yaml"),
    `rules:
  rule-a:
    description: "from parent"
    given: "$"
    then: { function: truthy }
    severity: warn
    meta: { bridgeApi: "1.x", category: structure, surface: [lint-time], status: active, since: "1.0.0" }
  rule-b:
    description: "from parent"
    given: "$"
    then: { function: truthy }
    severity: warn
    meta: { bridgeApi: "1.x", category: structure, surface: [lint-time], status: active, since: "1.0.0" }
`
  );
  await writeFile(
    path.join(dir, "child.yaml"),
    `extends: [./parent.yaml]
rules:
  rule-a:
    description: "overridden by child"
    given: "$"
    then: { function: truthy }
    severity: error
    meta: { bridgeApi: "1.x", category: structure, surface: [lint-time], status: active, since: "1.0.0" }
`
  );
  const config = await loadConfig(path.join(dir, "child.yaml"));
  assert.ok(config?.rules);
  // rule-a overridden, rule-b inherited
  const ruleA = config.rules["rule-a"];
  const ruleB = config.rules["rule-b"];
  assert.ok(ruleA && ruleA !== "off");
  assert.ok(ruleB && ruleB !== "off");
  assert.equal(ruleA.severity, "error"); // overridden
  assert.equal(ruleA.description, "overridden by child");
  assert.equal(ruleB.severity, "warn"); // inherited
});

test("loadConfig detects extends cycles", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "bridge-loader-cycle-"));
  await writeFile(
    path.join(dir, "a.yaml"),
    `extends: [./b.yaml]
rules: {}
`
  );
  await writeFile(
    path.join(dir, "b.yaml"),
    `extends: [./a.yaml]
rules: {}
`
  );
  await assert.rejects(
    () => loadConfig(path.join(dir, "a.yaml")),
    /cycle detected/
  );
});

test("loadConfig throws on missing relative extends path", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "bridge-loader-missing-"));
  await writeFile(
    path.join(dir, "config.yaml"),
    `extends: [./nonexistent.yaml]
rules: {}
`
  );
  await assert.rejects(
    () => loadConfig(path.join(dir, "config.yaml")),
    /extends missing file/
  );
});
