import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseDocsConfig } from "./docs-config.js";

test("parseDocsConfig accepts minimal config with defaults", async () => {
  const raw = await readFile(path.resolve("test/fixtures/docs-config/minimal.yaml"), "utf8");
  const cfg = parseDocsConfig(raw);
  assert.equal(cfg.dsName, "Spectra");
  assert.equal(cfg.kbPath, "bridge-ds");
  assert.equal(cfg.cron.cadence, "daily");
  assert.equal(cfg.cron.time, "06:00");
});

test("parseDocsConfig accepts full config", async () => {
  const raw = await readFile(path.resolve("test/fixtures/docs-config/full.yaml"), "utf8");
  const cfg = parseDocsConfig(raw);
  assert.equal(cfg.tagline, "Finary's design system.");
  assert.equal(cfg.kbPath, "bridge-ds");
});

test("parseDocsConfig throws on missing required field", () => {
  assert.throws(() => parseDocsConfig("dsName: Spectra\n"));
});

test("parseDocsConfig throws on empty dsName", () => {
  assert.throws(() => parseDocsConfig('dsName: ""\nfigmaFileKey: abc\n'));
});

test("parseDocsConfig rejects custom YAML tags (defense-in-depth)", () => {
  assert.throws(() =>
    parseDocsConfig('dsName: x\nfigmaFileKey: y\nkbPath: !!js/function "() => 1"\n')
  );
});
