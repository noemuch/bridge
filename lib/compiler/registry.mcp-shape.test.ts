import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadRegistry } from "./registry.js";

// Variables.json on disk uses two shapes in the wild:
//  - Flat:   { version, generatedAt, variables: [{ name, key, ... }] }       (REST extract)
//  - Nested: { meta, collections: { [name]: { variables: [...] } } }         (MCP plugin export)
// The compiler must read both — when REST returns 403 (non-Enterprise plans),
// the only path to refresh variables.json is the MCP plugin, which produces
// the nested shape.

function fixture(variablesJson: unknown): string {
  const dir = mkdtempSync(path.join(tmpdir(), "bridge-mcp-shape-"));
  const regDir = path.join(dir, "knowledge-base", "registries");
  mkdirSync(regDir, { recursive: true });
  writeFileSync(path.join(regDir, "components.json"), JSON.stringify({ version: 1, components: [] }));
  writeFileSync(path.join(regDir, "variables.json"), JSON.stringify(variablesJson));
  writeFileSync(path.join(regDir, "text-styles.json"), JSON.stringify({ styles: [] }));
  return dir;
}

test("loadRegistry reads the MCP-native variables.json shape (collections)", () => {
  const dir = fixture({
    meta: { source: "Foundations", totalVariables: 2 },
    collections: {
      layout: {
        variables: [
          { name: "layout/spacing/medium", key: "spacing_med_key", valuesByMode: { value: 16 } },
          { name: "layout/radius/medium", key: "radius_med_key", valuesByMode: { value: 12 } },
        ],
      },
      color: {
        variables: [
          { name: "color/background/surface/subtle", key: "surface_subtle_key", valuesByMode: {} },
        ],
      },
    },
  });
  try {
    const reg = loadRegistry(dir);
    assert.equal(reg.variables.byName.get("layout/spacing/medium")?.key, "spacing_med_key");
    assert.equal(reg.variables.byName.get("layout/radius/medium")?.key, "radius_med_key");
    assert.equal(reg.variables.byName.get("color/background/surface/subtle")?.key, "surface_subtle_key");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadRegistry still reads the flat variables.json shape (REST extract)", () => {
  const dir = fixture({
    version: 1,
    generatedAt: "2026-05-18T00:00:00Z",
    variables: [
      { name: "layout/spacing/medium", key: "spacing_med_key" },
      { name: "layout/radius/medium", key: "radius_med_key" },
    ],
  });
  try {
    const reg = loadRegistry(dir);
    assert.equal(reg.variables.byName.get("layout/spacing/medium")?.key, "spacing_med_key");
    assert.equal(reg.variables.byName.get("layout/radius/medium")?.key, "radius_med_key");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
