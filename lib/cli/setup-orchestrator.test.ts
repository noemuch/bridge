import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { scaffold, runPreflight } from "./setup-orchestrator.js";

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const cwd = process.cwd();
  const dir = await mkdtemp(path.join(tmpdir(), "bridge-setup-"));
  process.chdir(dir);
  try {
    return await fn(dir);
  } finally {
    process.chdir(cwd);
  }
}

test("scaffold creates the expected directory tree with defaults", async () => {
  await withTempDir(async (dir) => {
    const created = await scaffold({ dsName: "Spectra", figmaFileKey: "KEY123" });
    // Expected files and directories are returned in the `created` list
    // AND physically exist on disk.
    for (const relPath of ["docs.config.yaml", ".github/workflows/bridge-kb-cron.yml"]) {
      assert.ok(created.includes(relPath), `created list missing ${relPath}`);
      assert.ok(await exists(path.join(dir, relPath)), `${relPath} not on disk`);
    }
    for (const dirPath of [
      "bridge-ds/knowledge-base/registries/",
      "bridge-ds/knowledge-base/recipes/",
      ".bridge/",
      ".github/workflows/",
    ]) {
      assert.ok(created.includes(dirPath), `created list missing ${dirPath}`);
    }
  });
});

test("scaffold respects custom kbPath", async () => {
  await withTempDir(async (dir) => {
    const created = await scaffold({
      dsName: "Custom",
      figmaFileKey: "K",
      kbPath: "custom-kb",
    });
    assert.ok(await exists(path.join(dir, "custom-kb", "knowledge-base", "registries")));
    assert.ok(created.some((p) => p.startsWith("custom-kb/")));
  });
});

test("scaffold writes a docs.config.yaml that embeds the dsName and key", async () => {
  await withTempDir(async (dir) => {
    await scaffold({ dsName: "Acme", figmaFileKey: "abc123" });
    const yaml = await readFile(path.join(dir, "docs.config.yaml"), "utf8");
    assert.match(yaml, /dsName: "Acme"/);
    assert.match(yaml, /figmaFileKey: "abc123"/);
    assert.match(yaml, /cadence: "daily"/);
  });
});

test("scaffold creates .bridge/ directory for cron reports", async () => {
  await withTempDir(async (dir) => {
    await scaffold({ dsName: "X", figmaFileKey: "Y" });
    assert.ok(await exists(path.join(dir, ".bridge")));
  });
});

test("scaffold produces a cron workflow with the daily schedule", async () => {
  await withTempDir(async (dir) => {
    await scaffold({ dsName: "X", figmaFileKey: "Y" });
    const yml = await readFile(path.join(dir, ".github/workflows/bridge-kb-cron.yml"), "utf8");
    assert.match(yml, /Bridge KB — Daily Sync/);
    assert.match(yml, /schedule:\s*-\s*cron: "0 6 \* \* \*"/);
    assert.match(yml, /secrets\.FIGMA_TOKEN/);
    assert.match(yml, /npx -y @noemuch\/bridge-ds@/);
  });
});

test("runPreflight returns nullable remote + Figma-key without touching disk state", async () => {
  await withTempDir(async () => {
    const pre = await runPreflight();
    // In an empty temp dir, neither is detectable — both must resolve to null.
    assert.equal(pre.gitRemote, null);
    assert.equal(pre.figmaKey, null);
  });
});
