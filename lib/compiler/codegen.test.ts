import { test } from "node:test";
import assert from "node:assert/strict";
import { generateCode } from "./codegen.js";
import type { Chunk } from "./plan.js";

function singleChunk(): Chunk {
  return {
    label: "build",
    index: 0,
    nodes: [],
    imports: { variables: [], components: [], textStyles: [] },
  } as unknown as Chunk;
}

test("root frame is placed in clear space, not hardcoded at (0,0)", () => {
  const code = generateCode(singleChunk(), {
    rootName: "Screen",
    rootWidth: 1440,
    rootHeight: 900,
  });
  assert.ok(
    code.includes("figma.currentPage.children"),
    "expected a scan over figma.currentPage.children for placement"
  );
  assert.ok(
    !/root\.x\s*=\s*0\s*;/.test(code),
    "root.x must be computed, not hardcoded to 0"
  );
  assert.ok(code.includes("figma.currentPage.appendChild(root)"));
});
