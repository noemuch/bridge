import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadRegistry } from "./registry.js";
import { KBSchemaError } from "../kb/schema-version.js";

test("loadRegistry refuses a legacy-grouped KB with KBSchemaError", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "bridge-compiler-guard-"));
  const regDir = path.join(dir, "knowledge-base", "registries");
  mkdirSync(regDir, { recursive: true });
  writeFileSync(
    path.join(regDir, "components.json"),
    JSON.stringify({
      components: { forms: [] },
    })
  );
  writeFileSync(path.join(regDir, "variables.json"), JSON.stringify({ variables: [] }));
  writeFileSync(path.join(regDir, "text-styles.json"), JSON.stringify({ styles: [] }));
  try {
    assert.throws(
      () => loadRegistry(dir),
      (err: Error) => err instanceof KBSchemaError
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
