import { test } from "node:test";
import assert from "node:assert/strict";
import { generateCode } from "./codegen.js";
import type { Chunk } from "./plan.js";
import { HELPER_BLOCK } from "./helpers.js";

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

// Reconstruct the runtime findPropKey from the injected helper block so we can
// test its matching behavior directly.
function loadFindPropKey(): (compSet: unknown, prefix: string, type: string) => string | undefined {
  return new Function(HELPER_BLOCK + "\nreturn findPropKey;")() as never;
}

test("findPropKey matches exact name segment, not a shared prefix", () => {
  const findPropKey = loadFindPropKey();
  const compSet = {
    componentPropertyDefinitions: {
      "Label secondary#3:4": { type: "TEXT" },
      "Label#1:2": { type: "TEXT" },
      "Size": { type: "VARIANT" },
    },
  };
  assert.equal(findPropKey(compSet, "Label", "TEXT"), "Label#1:2");
  assert.equal(findPropKey(compSet, "Size", "VARIANT"), "Size");
  assert.equal(findPropKey(compSet, "Nope", "TEXT"), undefined);
});

test("multiple imports are batched into a single Promise.all", () => {
  const chunk = {
    label: "build",
    index: 0,
    nodes: [],
    imports: {
      variables: [
        { kind: "variable", key: "VariableID:1:1", name: "color/bg", ref: "$color/bg" },
        { kind: "variable", key: "VariableID:1:2", name: "spacing/md", ref: "$spacing/md" },
      ],
      components: [
        { kind: "component", key: "comp-button", name: "Button", ref: "$comp/Button" },
      ],
      textStyles: [],
    },
  } as unknown as Chunk;

  const code = generateCode(chunk, { rootName: "S", rootWidth: 100, rootHeight: 100 });
  assert.ok(code.includes("Promise.all"), "imports must be batched via Promise.all");
});

test("a single import still compiles correctly", () => {
  const chunk = {
    label: "build",
    index: 0,
    nodes: [],
    imports: {
      variables: [{ kind: "variable", key: "VariableID:1:1", name: "color/bg", ref: "$color/bg" }],
      components: [],
      textStyles: [],
    },
  } as unknown as Chunk;
  const code = generateCode(chunk, { rootName: "S", rootWidth: 100, rootHeight: 100 });
  assert.ok(code.includes("importVariableByKeyAsync"));
});
