// lib/docs/generate.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { check } from "./generate.js";

test("check returns empty report for non-existent path", async () => {
  const r = await check({ docsPath: "tmp/no/such/path" });
  assert.equal(r.files, 0);
  assert.equal(r.issues, 0);
});
