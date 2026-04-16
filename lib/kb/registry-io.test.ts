import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  readComponentRegistry,
  readVariableRegistry,
  readTextStyleRegistry,
} from "./registry-io.js";

const FIX = path.resolve("test/fixtures/kb/registries");

test("readComponentRegistry parses components with keys", async () => {
  const r = await readComponentRegistry(path.join(FIX, "components.json"));
  assert.equal(r.components.length, 1);
  assert.equal(r.components[0].key, "abc123def456");
  assert.equal(r.components[0].name, "Button");
});

test("readVariableRegistry parses color variables", async () => {
  const r = await readVariableRegistry(path.join(FIX, "variables.json"));
  assert.equal(r.variables[0].resolvedType, "COLOR");
  assert.ok((r.variables[0].valuesByMode as any).light);
});

test("readTextStyleRegistry returns styles", async () => {
  const r = await readTextStyleRegistry(path.join(FIX, "text-styles.json"));
  assert.equal(r.styles[0].fontFamily, "Inter");
});

test("throws on missing file", async () => {
  await assert.rejects(() =>
    readComponentRegistry("test/fixtures/kb/registries/does-not-exist.json")
  );
});
