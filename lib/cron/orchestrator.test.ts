// lib/cron/orchestrator.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { runCron } from "./orchestrator.js";

test("runCron throws without FIGMA_TOKEN", async () => {
  const original = process.env.FIGMA_TOKEN;
  delete process.env.FIGMA_TOKEN;
  try {
    await assert.rejects(() => runCron({ configPath: "test/fixtures/docs-config/minimal.yaml" }));
  } finally {
    if (original !== undefined) process.env.FIGMA_TOKEN = original;
  }
});

test("orchestrator module loads", async () => {
  const mod = await import("./orchestrator.js");
  assert.equal(typeof mod.runCron, "function");
});
