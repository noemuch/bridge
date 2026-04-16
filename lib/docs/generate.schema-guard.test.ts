import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { build } from "./generate.js";
import { KBSchemaError } from "../kb/schema-version.js";

test("docs build refuses a legacy-grouped KB with KBSchemaError", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "bridge-docs-guard-"));
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
    // build is async and its guard is sync but runs before awaiting anything,
    // so the synchronous throw becomes an async rejection the moment build() is called.
    await assert.rejects(
      () =>
        build({
          kbPath: dir,
          docsPath: path.join(dir, "design-system"),
          dsName: "Test",
          tagline: "",
        }),
      (err: Error) => err instanceof KBSchemaError
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
