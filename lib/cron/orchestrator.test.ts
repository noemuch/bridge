import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runCron } from "./orchestrator.js";

test("runCron throws a clear error when FIGMA_TOKEN is unset", async () => {
  const original = process.env.FIGMA_TOKEN;
  delete process.env.FIGMA_TOKEN;
  try {
    await assert.rejects(
      () => runCron({ configPath: "test/fixtures/docs-config/minimal.yaml" }),
      /FIGMA_TOKEN env var is required/
    );
  } finally {
    if (original !== undefined) process.env.FIGMA_TOKEN = original;
  }
});

test("runCron surfaces config parsing errors instead of calling Figma", async () => {
  const original = process.env.FIGMA_TOKEN;
  process.env.FIGMA_TOKEN = "dummy";
  try {
    await assert.rejects(() => runCron({ configPath: "test/fixtures/docs-config/missing.yaml" }));
  } finally {
    if (original !== undefined) process.env.FIGMA_TOKEN = original;
    else delete process.env.FIGMA_TOKEN;
  }
});

test("runCron integration: MCP-free end-to-end on fake fetch", async () => {
  // Run the orchestrator against a throwaway directory with a real
  // docs.config.yaml and a monkey-patched `fetch` so we exercise the full
  // pipeline without touching the network.
  const originalFetch = global.fetch;
  const originalToken = process.env.FIGMA_TOKEN;
  const originalCwd = process.cwd();
  const dir = await mkdtemp(path.join(tmpdir(), "bridge-cron-int-"));

  const variables = {
    meta: {
      variableCollections: { C1: { id: "C1", modes: [{ modeId: "m1", name: "light" }] } },
      variables: {
        V1: {
          key: "V1",
          name: "color/bg/default",
          variableCollectionId: "C1",
          resolvedType: "COLOR",
          valuesByMode: { m1: { r: 0, g: 0, b: 0, a: 1 } },
          scopes: ["ALL_SCOPES"],
        },
      },
    },
  };
  const components = { meta: { components: [] } };
  const styles = { meta: { styles: [] } };

  global.fetch = (async (url: unknown) => {
    const u = String(url);
    let body: unknown;
    if (u.includes("/variables/local")) body = variables;
    else if (u.includes("/components")) body = components;
    else if (u.includes("/styles")) body = styles;
    else throw new Error(`unexpected fetch: ${u}`);
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;

  try {
    process.env.FIGMA_TOKEN = "dummy";
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "docs.config.yaml"),
      `dsName: "TestDS"\nfigmaFileKey: "KEY"\nkbPath: "kb"\n`
    );
    process.chdir(dir);
    const report = await runCron({ configPath: "docs.config.yaml" });
    assert.equal(report.extracted, true);
    const body = await readFile(path.join(dir, ".bridge/last-sync-report.md"), "utf8");
    assert.match(body, /Bridge KB sync/);
  } finally {
    process.chdir(originalCwd);
    global.fetch = originalFetch;
    if (originalToken !== undefined) process.env.FIGMA_TOKEN = originalToken;
    else delete process.env.FIGMA_TOKEN;
  }
});
