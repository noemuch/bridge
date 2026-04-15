// lib/docs/state.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { readState, writeState } from "./state.js";

test("readState returns empty on missing file", async () => {
  const s = await readState(path.join(os.tmpdir(), "bridge-nonexistent-" + Date.now()));
  assert.equal(s.version, 1);
  assert.equal(s.registriesHash, "");
  assert.deepEqual(s.perFileHashes, {});
});

test("writeState then readState roundtrip", async () => {
  const dir = path.join(os.tmpdir(), "bridge-docs-state-" + Date.now());
  await writeState(dir, { version: 1, registriesHash: "abc", learningsHash: "def", lastSyncAt: "2026-04-15T06:00:00Z", perFileHashes: { "X.md": "h1" } });
  const s = await readState(dir);
  assert.equal(s.registriesHash, "abc");
  assert.equal(s.learningsHash, "def");
  assert.equal(s.lastSyncAt, "2026-04-15T06:00:00Z");
  assert.equal(s.perFileHashes["X.md"], "h1");
});
