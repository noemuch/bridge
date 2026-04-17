import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const BIN = path.resolve("bin/bridge.js");

function run(args: string[], env: Record<string, string> = {}) {
  return spawnSync(process.execPath, [BIN, ...args], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

test("help prints the command list and exits 0", () => {
  const r = run(["help"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /bridge-ds v\d+\.\d+\.\d+/);
  assert.match(r.stdout, /setup\s+Headless scaffold/);
  assert.match(r.stdout, /cron/);
});

test("no args shows help (exit 0)", () => {
  const r = run([]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /bridge-ds v/);
});

test("version prints only the semantic version", () => {
  const r = run(["version"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout.trim(), /^bridge-ds v\d+\.\d+\.\d+$/);
});

test("unknown command exits non-zero with a helpful message", () => {
  const r = run(["nonexistent-cmd"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Unknown command: nonexistent-cmd/);
});

test("removed v5 commands (init, update, docs, init-docs) now error as Unknown command", () => {
  for (const cmd of ["init", "update", "init-docs", "docs"]) {
    const r = run([cmd]);
    assert.notEqual(r.status, 0, `${cmd} should exit non-zero`);
    assert.match(r.stderr, /Unknown command/, `${cmd} should show Unknown command`);
  }
});

test("`extract` without --headless errors (safety net)", () => {
  const r = run(["extract"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Only headless extraction/);
});

test("bridge-ds migrate exits 0 on a legacy KB and makes it current", () => {
  const FIXTURE = path.resolve("test/fixtures/kb/legacy-grouped");
  const dir = mkdtempSync(path.join(tmpdir(), "bridge-cli-e2e-"));
  cpSync(FIXTURE, dir, { recursive: true });
  try {
    const r = run(["migrate", "--kb-path", dir]);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    const result = JSON.parse(r.stdout);
    assert.equal(result.migrated, true);
    assert.equal(result.from, "legacy-grouped");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
