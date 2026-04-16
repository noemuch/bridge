import { test } from "node:test";
import assert from "node:assert/strict";
import { setGitHubSecret, maskToken, validateFigmaToken } from "../../lib/cli/token-handling.js";

const SENTINEL = "figd_TESTSENTINEL_0000000000000";

test("token never appears in process.env after set operation", async () => {
  const envBefore = Object.values(process.env).join("");
  assert.ok(!envBefore.includes(SENTINEL), "sentinel must not be pre-seeded in env");

  const fakeSpawn = (_cmd: string, _args: readonly string[], _opts: any) => {
    const proc: any = {
      stdin: {
        write() {
          return true;
        },
        end() {},
      },
      on(event: string, cb: (code: number) => void) {
        if (event === "exit") setTimeout(() => cb(0), 0);
        return proc;
      },
    };
    return proc;
  };

  await setGitHubSecret({
    name: "FIGMA_TOKEN",
    value: SENTINEL,
    repo: "acme/test",
    spawnImpl: fakeSpawn as any,
  });

  const envAfter = Object.values(process.env).join("");
  assert.ok(!envAfter.includes(SENTINEL), "sentinel leaked into process.env");
});

test("maskToken never returns full token", () => {
  const masked = maskToken(SENTINEL);
  assert.ok(!masked.includes("TESTSENTINEL"), "masked output exposed the middle of the token");
  assert.ok(masked.startsWith("figd_***"), "masked output must start with figd_***");
});

test("validateFigmaToken does not log the value on failure", async () => {
  const logs: string[] = [];
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };

  try {
    const fakeFetch = async () => ({ ok: false, status: 401 }) as Response;
    await validateFigmaToken(SENTINEL, fakeFetch as any);
  } finally {
    console.error = origError;
  }

  const joined = logs.join("\n");
  assert.ok(!joined.includes(SENTINEL), "token leaked into console.error");
});
