// lib/docs/generate.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { check, sync } from "./generate.js";

test("check returns empty report for non-existent path", async () => {
  const r = await check({ docsPath: "tmp/no/such/path" });
  assert.equal(r.files, 0);
  assert.equal(r.issues, 0);
});

test("sync: first run (no prior state) produces non-empty regenerated list", async (t) => {
  const tmp = path.join(os.tmpdir(), "bridge-sync-firstrun-" + Date.now());
  const kbPath = path.join(tmp, "bridge-ds");
  const docsPath = path.join(tmp, "design-system");
  await mkdir(path.join(kbPath, "knowledge-base", "registries"), { recursive: true });
  await mkdir(path.join(kbPath, "knowledge-base", "recipes"), { recursive: true });

  await writeFile(path.join(kbPath, "knowledge-base", "registries", "components.json"), JSON.stringify({
    version: 1, generatedAt: "now",
    components: [{ key: "k1", name: "TestBtn", category: "actions", status: "stable", variants: [], properties: [] }],
  }, null, 2));
  await writeFile(path.join(kbPath, "knowledge-base", "registries", "variables.json"), JSON.stringify({ version: 1, generatedAt: "now", variables: [] }));
  await writeFile(path.join(kbPath, "knowledge-base", "registries", "text-styles.json"), JSON.stringify({ version: 1, generatedAt: "now", styles: [] }));
  await writeFile(path.join(kbPath, "knowledge-base", "learnings.json"), JSON.stringify({ learnings: [], flags: [] }));
  await writeFile(path.join(kbPath, "knowledge-base", "recipes", "_index.json"), JSON.stringify({ recipes: [] }));

  const cwd = process.cwd();
  process.chdir(tmp);
  try {
    const report = await sync({ kbPath, docsPath, dsName: "Test" });
    assert.equal(report.noDiff, false, "first run should not be noDiff");
    assert.ok(report.regenerated.length > 0, "first run must regen something");
  } finally {
    process.chdir(cwd);
  }
});

test("sync produces .llm.txt sidecar alongside component .md", async () => {
  const tmp = path.join(os.tmpdir(), "bridge-sync-llmtxt-" + Date.now());
  const kbPath = path.join(tmp, "bridge-ds");
  const docsPath = path.join(tmp, "design-system");
  await mkdir(path.join(kbPath, "knowledge-base", "registries"), { recursive: true });
  await mkdir(path.join(kbPath, "knowledge-base", "recipes"), { recursive: true });

  await writeFile(path.join(kbPath, "knowledge-base", "registries", "components.json"), JSON.stringify({
    version: 1, generatedAt: "now",
    components: [{ key: "k1", name: "TestLlm", category: "actions", status: "stable", variants: [], properties: [] }],
  }));
  await writeFile(path.join(kbPath, "knowledge-base", "registries", "variables.json"), JSON.stringify({ version: 1, generatedAt: "now", variables: [] }));
  await writeFile(path.join(kbPath, "knowledge-base", "registries", "text-styles.json"), JSON.stringify({ version: 1, generatedAt: "now", styles: [] }));
  await writeFile(path.join(kbPath, "knowledge-base", "learnings.json"), JSON.stringify({ learnings: [], flags: [] }));
  await writeFile(path.join(kbPath, "knowledge-base", "recipes", "_index.json"), JSON.stringify({ recipes: [] }));

  const cwd = process.cwd();
  process.chdir(tmp);
  try {
    const report = await sync({ kbPath, docsPath, dsName: "Test" });
    const mdPath = report.regenerated.find((p) => p.endsWith("TestLlm.md"));
    const llmPath = report.regenerated.find((p) => p.endsWith("TestLlm.llm.txt"));
    assert.ok(mdPath, "TestLlm.md must be in regenerated list");
    assert.ok(llmPath, "TestLlm.llm.txt must be in regenerated list");
  } finally {
    process.chdir(cwd);
  }
});

test("sync: second run with same registries hash returns noDiff", async (t) => {
  const tmp = path.join(os.tmpdir(), "bridge-sync-nodiff-" + Date.now());
  const kbPath = path.join(tmp, "bridge-ds");
  const docsPath = path.join(tmp, "design-system");
  await mkdir(path.join(kbPath, "knowledge-base", "registries"), { recursive: true });
  await mkdir(path.join(kbPath, "knowledge-base", "recipes"), { recursive: true });

  const writeAll = async () => {
    await writeFile(path.join(kbPath, "knowledge-base", "registries", "components.json"), JSON.stringify({
      version: 1, generatedAt: "now",
      components: [{ key: "k1", name: "TestBtn", category: "actions", status: "stable", variants: [], properties: [] }],
    }, null, 2));
    await writeFile(path.join(kbPath, "knowledge-base", "registries", "variables.json"), JSON.stringify({ version: 1, generatedAt: "now", variables: [] }));
    await writeFile(path.join(kbPath, "knowledge-base", "registries", "text-styles.json"), JSON.stringify({ version: 1, generatedAt: "now", styles: [] }));
    await writeFile(path.join(kbPath, "knowledge-base", "learnings.json"), JSON.stringify({ learnings: [], flags: [] }));
    await writeFile(path.join(kbPath, "knowledge-base", "recipes", "_index.json"), JSON.stringify({ recipes: [] }));
  };
  await writeAll();

  const cwd = process.cwd();
  process.chdir(tmp);
  try {
    await sync({ kbPath, docsPath, dsName: "Test" });
    const report2 = await sync({ kbPath, docsPath, dsName: "Test" });
    assert.equal(report2.noDiff, true, "second run must detect no diff");
    assert.equal(report2.regenerated.length, 0);
  } finally {
    process.chdir(cwd);
  }
});
