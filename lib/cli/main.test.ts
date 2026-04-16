import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
  assert.match(r.stdout, /bridge-ds v5\.\d+\.\d+/);
  assert.match(r.stdout, /setup\s+Headless scaffold/);
  assert.match(r.stdout, /docs build/);
  assert.match(r.stdout, /cron/);
});

test("no args shows help (exit 0)", () => {
  const r = run([]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /bridge-ds v5\./);
});

test("version prints only the semantic version", () => {
  const r = run(["version"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout.trim(), /^bridge-ds v5\.\d+\.\d+$/);
});

test("unknown command exits non-zero with a helpful message", () => {
  const r = run(["nonexistent-cmd"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Unknown command: nonexistent-cmd/);
});

test("`init` was removed in v5.0.0 and emits the migration notice", () => {
  const r = run(["init"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /removed in v5\.0\.0/);
  assert.match(r.stderr, /setup bridge/);
});

test("`update` was removed in v5.0.0 and emits the migration notice", () => {
  const r = run(["update"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /removed in v5\.0\.0/);
  assert.match(r.stderr, /plugin update bridge-ds/);
});

test("`docs` without a subcommand errors", () => {
  const r = run(["docs"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Unknown docs subcommand/);
});

test("`extract` without --headless errors (safety net)", () => {
  const r = run(["extract"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Only headless extraction/);
});
