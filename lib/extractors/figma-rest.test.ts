import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { extractFromFigma } from "./figma-rest.js";

function mockFetch(responsesByUrl: Record<string, unknown>): typeof fetch {
  return (async (url: any) => {
    const key = String(url);
    const body = responsesByUrl[key];
    if (!body) throw new Error(`unmocked url: ${key}`);
    return { ok: true, status: 200, async json() { return body; } } as Response;
  }) as typeof fetch;
}

test("extractFromFigma normalizes REST responses", async () => {
  const FIX = path.resolve("test/fixtures/figma-rest");
  const v = JSON.parse(await readFile(path.join(FIX, "variables-response.json"), "utf8"));
  const c = JSON.parse(await readFile(path.join(FIX, "components-response.json"), "utf8"));
  const s = JSON.parse(await readFile(path.join(FIX, "styles-response.json"), "utf8"));

  const fetchMock = mockFetch({
    "https://api.figma.com/v1/files/FILEKEY/variables/local": v,
    "https://api.figma.com/v1/files/FILEKEY/components": c,
    "https://api.figma.com/v1/files/FILEKEY/styles": s,
  });

  const result = await extractFromFigma({ fileKey: "FILEKEY", token: "figd_test", fetchImpl: fetchMock });

  assert.equal(result.variables.variables.length, 1);
  assert.equal(result.variables.variables[0].name, "color/bg/primary");
  assert.equal(result.variables.variables[0].key, "VAR_KEY_1");
  assert.ok((result.variables.variables[0].valuesByMode as any).light);
  assert.equal(result.components.components.length, 1);
  assert.equal(result.components.components[0].name, "Button");
  assert.equal(result.components.components[0].key, "COMPKEY_BTN");
  assert.equal(result.textStyles.styles.length, 1);
  assert.equal(result.textStyles.styles[0].name, "label/md");
});

test("extractFromFigma throws on missing token", async () => {
  await assert.rejects(() => extractFromFigma({ fileKey: "x", token: "" }));
});
