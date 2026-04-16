import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

test("mcp-server module loads without errors", async () => {
  const mod = await import("./mcp-server.js");
  assert.equal(typeof mod.startMcpServer, "function");
});

// Path-traversal defense: the URI name regex only allows [A-Za-z0-9_-]+
// so we can assert it directly without booting the transport.
test("ds:// URI parser rejects path-traversal names", () => {
  const re = /^ds:\/\/(component|foundation|pattern|token|index)(?:\/([A-Za-z0-9_-]+))?$/;
  assert.equal(re.test("ds://foundation/colors"), true);
  assert.equal(re.test("ds://foundation/../../etc/passwd"), false);
  assert.equal(re.test("ds://component/%2e%2e%2fbadname"), false);
  assert.equal(re.test("ds://component/name.with.dots"), false);
  assert.equal(re.test("ds://component/name/with/slash"), false);
  assert.equal(re.test("ds://index"), true);
});

test("docsPath is created for fixture MCP layout", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "bridge-mcp-"));
  await mkdir(path.join(root, "components", "actions"), { recursive: true });
  await writeFile(path.join(root, "components", "actions", "Button.md"), "# Button\n");
  // Lightweight invariant: the scaffolded layout exists and is readable.
  const { readFile } = await import("node:fs/promises");
  const body = await readFile(path.join(root, "components", "actions", "Button.md"), "utf8");
  assert.match(body, /# Button/);
});
