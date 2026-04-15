import { test } from "node:test";
import assert from "node:assert/strict";
import { stableStringify, sha256 } from "./hash.js";

test("stableStringify sorts object keys but preserves array order", () => {
  const obj = { b: 1, a: [3, 1, 2] };
  assert.equal(stableStringify(obj), '{"a":[3,1,2],"b":1}');
});
test("stableStringify handles nested objects", () => {
  assert.equal(stableStringify({ b: { d: 1, c: 2 }, a: 1 }), '{"a":1,"b":{"c":2,"d":1}}');
});
test("sha256 is deterministic for equivalent objects", () => {
  assert.equal(sha256({ x: 1, y: 2 }), sha256({ y: 2, x: 1 }));
});
test("sha256 returns 64-char hex", () => {
  assert.match(sha256({ any: "payload" }), /^[0-9a-f]{64}$/);
});
