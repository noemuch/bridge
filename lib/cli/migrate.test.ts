import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { migrate } from "./migrate.js";
import { assertKBCompatible } from "../kb/schema-version.js";

// Fixture path resolves from CWD (repo root).
const FIXTURE = path.resolve("test/fixtures/kb/legacy-grouped");

test("migrate() converts a legacy KB and leaves it compatible", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "bridge-cli-migrate-"));
  cpSync(FIXTURE, dir, { recursive: true });
  try {
    const result = await migrate({ kbPath: dir });
    assert.equal(result.migrated, true);
    assert.equal(result.from, "legacy-grouped");
    assert.equal(result.to, 1);
    assertKBCompatible(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("migrate() is a no-op on an already-current KB", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "bridge-cli-migrate-noop-"));
  const regDir = path.join(dir, "knowledge-base", "registries");
  const fs = await import("node:fs");
  fs.mkdirSync(regDir, { recursive: true });
  fs.writeFileSync(
    path.join(regDir, "components.json"),
    JSON.stringify({ version: 1, generatedAt: "2026-04-16T00:00:00Z", components: [] })
  );
  fs.writeFileSync(
    path.join(regDir, "variables.json"),
    JSON.stringify({ version: 1, generatedAt: "2026-04-16T00:00:00Z", variables: [] })
  );
  fs.writeFileSync(
    path.join(regDir, "text-styles.json"),
    JSON.stringify({ version: 1, generatedAt: "2026-04-16T00:00:00Z", styles: [] })
  );
  try {
    const result = await migrate({ kbPath: dir });
    assert.equal(result.migrated, false);
    assert.equal(result.from, "current");
    assert.equal(result.to, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("migrate() refuses a KB newer than CLI supports", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "bridge-cli-migrate-newer-"));
  const regDir = path.join(dir, "knowledge-base", "registries");
  const fs = await import("node:fs");
  fs.mkdirSync(regDir, { recursive: true });
  fs.writeFileSync(
    path.join(regDir, "components.json"),
    JSON.stringify({ version: 999, generatedAt: "2030-01-01T00:00:00Z", components: [] })
  );
  fs.writeFileSync(
    path.join(regDir, "variables.json"),
    JSON.stringify({ version: 999, generatedAt: "2030-01-01T00:00:00Z", variables: [] })
  );
  fs.writeFileSync(
    path.join(regDir, "text-styles.json"),
    JSON.stringify({ version: 999, generatedAt: "2030-01-01T00:00:00Z", styles: [] })
  );
  try {
    await assert.rejects(() => migrate({ kbPath: dir }), /newer/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
