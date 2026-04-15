import { test } from "node:test";
import assert from "node:assert/strict";

test("mcp-server module loads without errors", async () => {
  const mod = await import("./mcp-server.js");
  assert.equal(typeof mod.startMcpServer, "function");
});
