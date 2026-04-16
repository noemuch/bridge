import { test } from "node:test";
import assert from "node:assert/strict";

test("setGitHubSecret uses stdin pipe, not argv", async () => {
  const { setGitHubSecret } = await import("./token-handling.js");

  let capturedArgs: readonly string[] = [];
  let capturedStdin = "";

  const fakeSpawn = (_cmd: string, args: readonly string[], _opts: any) => {
    capturedArgs = args;
    const proc: any = {
      stdin: {
        write(data: Buffer | string) { capturedStdin += String(data); return true; },
        end() { /* finalize */ },
      },
      on(event: string, cb: (code: number) => void) { if (event === "exit") setTimeout(() => cb(0), 0); return proc; },
    };
    return proc;
  };

  await setGitHubSecret({
    name: "FIGMA_TOKEN",
    value: "figd_TESTSENTINEL_123",
    repo: "acme/ds",
    spawnImpl: fakeSpawn as any,
  });

  assert.ok(!capturedArgs.includes("figd_TESTSENTINEL_123"), "token must never appear in argv");
  assert.equal(capturedStdin, "figd_TESTSENTINEL_123", "token must arrive via stdin");
});

test("setGitHubSecret rejects on nonzero exit code", async () => {
  const { setGitHubSecret } = await import("./token-handling.js");

  const fakeSpawn = (_cmd: string, _args: readonly string[], _opts: any) => {
    const proc: any = {
      stdin: { write() { return true; }, end() {} },
      on(event: string, cb: (code: number) => void) { if (event === "exit") setTimeout(() => cb(1), 0); return proc; },
    };
    return proc;
  };

  await assert.rejects(async () => {
    await setGitHubSecret({ name: "X", value: "v", repo: "r", spawnImpl: fakeSpawn as any });
  });
});

test("maskToken returns figd_***<last4>", async () => {
  const { maskToken } = await import("./token-handling.js");
  assert.equal(maskToken("figd_abcdefghijklmnop"), "figd_***mnop");
  assert.equal(maskToken(""), "(empty)");
  assert.equal(maskToken("short"), "***"); // too short to show tail
});

test("validateFigmaToken returns false on 401", async () => {
  const { validateFigmaToken } = await import("./token-handling.js");
  const fakeFetch = async () => ({ ok: false, status: 401 } as Response);
  const ok = await validateFigmaToken("figd_bad", fakeFetch as any);
  assert.equal(ok, false);
});

test("validateFigmaToken returns true on 200", async () => {
  const { validateFigmaToken } = await import("./token-handling.js");
  const fakeFetch = async () => ({ ok: true, status: 200, async json() { return { email: "x" }; } } as Response);
  const ok = await validateFigmaToken("figd_good", fakeFetch as any);
  assert.equal(ok, true);
});
