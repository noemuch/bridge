import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  CURRENT_KB_SCHEMA_VERSION,
  assertKBCompatible,
  readKBSchemaVersion,
  KBSchemaError,
} from "./schema-version.js";

function makeFixture(shape: "current" | "legacy-grouped" | "newer"): string {
  const dir = mkdtempSync(path.join(tmpdir(), "bridge-kb-"));
  const regDir = path.join(dir, "knowledge-base", "registries");
  mkdirSync(regDir, { recursive: true });
  if (shape === "current") {
    writeFileSync(
      path.join(regDir, "components.json"),
      JSON.stringify({
        version: 1,
        generatedAt: "2026-04-16T00:00:00Z",
        components: [],
      })
    );
    writeFileSync(
      path.join(regDir, "variables.json"),
      JSON.stringify({
        version: 1,
        generatedAt: "2026-04-16T00:00:00Z",
        variables: [],
      })
    );
    writeFileSync(
      path.join(regDir, "text-styles.json"),
      JSON.stringify({
        version: 1,
        generatedAt: "2026-04-16T00:00:00Z",
        styles: [],
      })
    );
  } else if (shape === "legacy-grouped") {
    writeFileSync(
      path.join(regDir, "components.json"),
      JSON.stringify({
        components: { forms: [], actions: [] },
      })
    );
    writeFileSync(
      path.join(regDir, "variables.json"),
      JSON.stringify({
        variables: [],
      })
    );
    writeFileSync(
      path.join(regDir, "text-styles.json"),
      JSON.stringify({
        styles: [],
      })
    );
  } else {
    writeFileSync(
      path.join(regDir, "components.json"),
      JSON.stringify({
        version: 999,
        generatedAt: "2030-01-01T00:00:00Z",
        components: [],
      })
    );
    writeFileSync(
      path.join(regDir, "variables.json"),
      JSON.stringify({
        version: 999,
        generatedAt: "2030-01-01T00:00:00Z",
        variables: [],
      })
    );
    writeFileSync(
      path.join(regDir, "text-styles.json"),
      JSON.stringify({
        version: 999,
        generatedAt: "2030-01-01T00:00:00Z",
        styles: [],
      })
    );
  }
  return dir;
}

test("CURRENT_KB_SCHEMA_VERSION is 1", () => {
  assert.equal(CURRENT_KB_SCHEMA_VERSION, 1);
});

test("assertKBCompatible passes on current-shape KB", () => {
  const dir = makeFixture("current");
  try {
    assertKBCompatible(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("assertKBCompatible throws KBSchemaError on legacy grouped shape", () => {
  const dir = makeFixture("legacy-grouped");
  try {
    assert.throws(
      () => assertKBCompatible(dir),
      (err: Error) => {
        assert.ok(err instanceof KBSchemaError);
        assert.match(err.message, /legacy/i);
        assert.match(err.message, /bridge-ds migrate/);
        return true;
      }
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("assertKBCompatible throws KBSchemaError when KB is newer than this CLI", () => {
  const dir = makeFixture("newer");
  try {
    assert.throws(
      () => assertKBCompatible(dir),
      (err: Error) => {
        assert.ok(err instanceof KBSchemaError);
        assert.match(err.message, /newer/i);
        assert.match(err.message, /upgrade/i);
        return true;
      }
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("readKBSchemaVersion returns the version from components.json", () => {
  const dir = makeFixture("current");
  try {
    const v = readKBSchemaVersion(dir);
    assert.equal(v, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("readKBSchemaVersion returns null when registries are absent", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "bridge-kb-empty-"));
  try {
    const v = readKBSchemaVersion(dir);
    assert.equal(v, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
