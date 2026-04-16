// Regression tests for the compile pipeline.
// Build a minimal on-disk KB in a temp dir, then exercise the three
// top-level outcomes: success, resolve error, transport misuse.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { compile } from "./compile.js";
import type { CompileOptions } from "./compile.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface TempKb {
  kbPath: string;
  cleanup(): void;
}

function writeTempKb(): TempKb {
  const root = mkdtempSync(path.join(os.tmpdir(), "bridge-compile-test-"));
  const regs = path.join(root, "knowledge-base", "registries");
  mkdirSync(regs, { recursive: true });

  writeFileSync(
    path.join(regs, "variables.json"),
    JSON.stringify({
      version: 1,
      generatedAt: new Date().toISOString(),
      variables: [
        {
          name: "color/bg/primary",
          key: "VariableID:1:1",
          resolvedType: "COLOR",
          valuesByMode: {},
        },
        { name: "spacing/md", key: "VariableID:1:2", resolvedType: "FLOAT", valuesByMode: {} },
        { name: "radius/md", key: "VariableID:1:3", resolvedType: "FLOAT", valuesByMode: {} },
      ],
    })
  );

  writeFileSync(
    path.join(regs, "components.json"),
    JSON.stringify({
      version: 1,
      generatedAt: new Date().toISOString(),
      components: [
        {
          name: "Button",
          key: "comp-button-key-0001",
          category: "actions",
          status: "stable",
          variants: [],
          properties: [],
        },
      ],
    })
  );

  writeFileSync(
    path.join(regs, "text-styles.json"),
    JSON.stringify({
      version: 1,
      generatedAt: new Date().toISOString(),
      styles: [
        {
          name: "text/label/md",
          key: "TextStyle:42",
          fontFamily: "Inter",
          fontStyle: "Regular",
          fontSize: 14,
        },
      ],
    })
  );

  return {
    kbPath: root,
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}

function validSceneGraph(): object {
  return {
    version: "3.0",
    metadata: { name: "TestRoot", width: 800, height: 600 },
    fonts: [{ family: "Inter", style: "Regular" }],
    nodes: [
      {
        type: "FRAME",
        name: "Card",
        layout: "VERTICAL",
        primaryAxisSizing: "AUTO",
        counterAxisSizing: "FIXED",
        width: 400,
        height: 200,
        fill: "$color/bg/primary",
        padding: "$spacing/md",
        radius: "$radius/md",
        children: [
          {
            type: "TEXT",
            name: "Title",
            characters: "Hello",
            textStyle: "$text/label/md",
          },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("compile() returns success for a valid scene graph", () => {
  const kb = writeTempKb();
  try {
    const result = compile({
      input: validSceneGraph(),
      kbPath: kb.kbPath,
      transport: "console",
    });

    assert.equal(result.success, true, JSON.stringify(result.errors));
    assert.equal(result.errors.length, 0);
    assert.ok(result.chunks.length >= 1);
    assert.ok(result.chunks[0]!.code.length > 0);
    assert.equal(typeof result.chunks[0]!.id, "string");
    assert.ok(result.plan);
    assert.equal(result.plan!.totalChunks, result.chunks.length);
  } finally {
    kb.cleanup();
  }
});

test("compile() reports RESOLVE_TOKEN_NOT_FOUND for an unknown token", () => {
  const kb = writeTempKb();
  try {
    const graph = validSceneGraph() as { nodes: Array<{ fill?: string }> };
    graph.nodes[0]!.fill = "$color/bg/does-not-exist";

    const result = compile({
      input: graph,
      kbPath: kb.kbPath,
      transport: "console",
    });

    assert.equal(result.success, false);
    assert.ok(result.errors.length > 0);
    const codes = result.errors.map((e) => e.code);
    assert.ok(
      codes.includes("RESOLVE_TOKEN_NOT_FOUND"),
      "expected RESOLVE_TOKEN_NOT_FOUND in " + codes.join(",")
    );
    assert.equal(result.chunks.length, 0);
    assert.equal(result.plan, null);
  } finally {
    kb.cleanup();
  }
});

test("compile() rejects the official transport without a fileKey", () => {
  const kb = writeTempKb();
  try {
    const result = compile({
      input: validSceneGraph(),
      kbPath: kb.kbPath,
      // Force official transport, but omit fileKey — wrap.ts should throw
      // WRAP_MISSING_FILEKEY which compile() catches and reports as an error.
      transport: "official",
      fileKey: null,
    } as CompileOptions);

    assert.equal(result.success, false);
    const codes = result.errors.map((e) => e.code);
    assert.ok(
      codes.includes("WRAP_MISSING_FILEKEY"),
      "expected WRAP_MISSING_FILEKEY in " + codes.join(",")
    );
    assert.equal(result.chunks.length, 0);
  } finally {
    kb.cleanup();
  }
});

test("compile() reports PARSE_INVALID_JSON for malformed input strings", () => {
  const kb = writeTempKb();
  try {
    const result = compile({
      input: "{not valid json",
      kbPath: kb.kbPath,
    });
    assert.equal(result.success, false);
    assert.equal(result.errors[0]?.code, "PARSE_INVALID_JSON");
  } finally {
    kb.cleanup();
  }
});
