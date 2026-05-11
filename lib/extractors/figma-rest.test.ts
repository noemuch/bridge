import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  extractFromFigma,
  extractComponentsFromFigma,
  extractVariablesFromFigma,
  extractTextStylesFromFigma,
} from "./figma-rest.js";

function mockFetch(responsesByUrl: Record<string, unknown>): typeof fetch {
  return (async (url: any) => {
    const key = String(url);
    const body = responsesByUrl[key];
    if (!body) throw new Error(`unmocked url: ${key}`);
    return {
      ok: true,
      status: 200,
      async json() {
        return body;
      },
    } as Response;
  }) as typeof fetch;
}

function recordingFetch(responsesByUrl: Record<string, unknown>): {
  fetchImpl: typeof fetch;
  urls: string[];
} {
  const urls: string[] = [];
  const fetchImpl = (async (url: any) => {
    const key = String(url);
    urls.push(key);
    const body = responsesByUrl[key];
    if (!body) throw new Error(`unmocked url: ${key}`);
    return {
      ok: true,
      status: 200,
      async json() {
        return body;
      },
    } as Response;
  }) as typeof fetch;
  return { fetchImpl, urls };
}

test("extractFromFigma normalizes REST responses", async () => {
  const FIX = path.resolve("test/fixtures/figma-rest");
  const v = JSON.parse(await readFile(path.join(FIX, "variables-response.json"), "utf8"));
  const c = JSON.parse(await readFile(path.join(FIX, "components-response.json"), "utf8"));
  const cs = JSON.parse(await readFile(path.join(FIX, "component-sets-response.json"), "utf8"));
  const n = JSON.parse(await readFile(path.join(FIX, "nodes-response.json"), "utf8"));
  const s = JSON.parse(await readFile(path.join(FIX, "styles-response.json"), "utf8"));

  const fetchMock = mockFetch({
    "https://api.figma.com/v1/files/FILEKEY/variables/local": v,
    "https://api.figma.com/v1/files/FILEKEY/components": c,
    "https://api.figma.com/v1/files/FILEKEY/component_sets": cs,
    "https://api.figma.com/v1/files/FILEKEY/nodes?ids=1%3A100&depth=1": n,
    "https://api.figma.com/v1/files/FILEKEY/styles": s,
  });

  const result = await extractFromFigma({
    fileKey: "FILEKEY",
    token: "figd_test",
    fetchImpl: fetchMock,
  });

  assert.equal(result.variables.variables.length, 1);
  assert.equal(result.variables.variables[0].name, "color/bg/primary");
  assert.equal(result.variables.variables[0].key, "VAR_KEY_1");
  assert.ok((result.variables.variables[0].valuesByMode as any).light);

  // The Button COMPONENT_SET enriched from /nodes, plus the standalone
  // "Divider" component. The Button variant instance (1:101) is filtered
  // out because it carries component_set_id.
  const comps = result.components.components as unknown as Array<Record<string, any>>;
  assert.equal(comps.length, 2);
  const btn = comps.find((c) => c.name === "Button")!;
  assert.equal(btn.type, "COMPONENT_SET");
  assert.equal(btn.key, "SETKEY_BTN");
  assert.equal(btn.variants, 6);
  assert.equal(btn.properties["variant"], "VARIANT(primary,secondary,tertiary)");
  assert.equal(btn.properties["size"], "VARIANT(large,medium,small)");
  assert.equal(btn.properties["hasIcon#1345:0"], "BOOLEAN");
  assert.equal(btn.properties["label#1057:0"], "TEXT");

  const divider = comps.find((c) => c.name === "Divider")!;
  assert.equal(divider.type, "COMPONENT");
  assert.deepEqual(divider.properties, {});

  assert.equal(result.textStyles.styles.length, 1);
  assert.equal(result.textStyles.styles[0].name, "label/md");
});

test("extractFromFigma throws on missing token", async () => {
  await assert.rejects(() => extractFromFigma({ fileKey: "x", token: "" }));
});

test("extractComponentsFromFigma fetches components + component_sets + /nodes for property defs", async () => {
  const FIX = path.resolve("test/fixtures/figma-rest");
  const c = JSON.parse(await readFile(path.join(FIX, "components-response.json"), "utf8"));
  const cs = JSON.parse(await readFile(path.join(FIX, "component-sets-response.json"), "utf8"));
  const n = JSON.parse(await readFile(path.join(FIX, "nodes-response.json"), "utf8"));
  const { fetchImpl, urls } = recordingFetch({
    "https://api.figma.com/v1/files/FILEKEY/components": c,
    "https://api.figma.com/v1/files/FILEKEY/component_sets": cs,
    "https://api.figma.com/v1/files/FILEKEY/nodes?ids=1%3A100&depth=1": n,
  });
  const reg = await extractComponentsFromFigma({
    fileKey: "FILEKEY",
    token: "figd_test",
    fetchImpl,
  });
  // Exactly the three endpoints the extractor needs, in any order.
  assert.equal(urls.length, 3);
  assert.ok(urls.some((u) => u.endsWith("/components")));
  assert.ok(urls.some((u) => u.endsWith("/component_sets")));
  assert.ok(urls.some((u) => u.includes("/nodes?ids=")));
  // Output has both the enriched COMPONENT_SET and the standalone COMPONENT.
  assert.equal(reg.components.length, 2);
});

test("extractComponentsFromFigma skips the /nodes call when no component sets exist", async () => {
  // Files with only standalone components shouldn't pay the cost of a /nodes
  // request — verify that the extractor's 2-pass logic short-circuits cleanly.
  const { fetchImpl, urls } = recordingFetch({
    "https://api.figma.com/v1/files/FILEKEY/components": {
      meta: { components: [{ key: "K", name: "Solo", node_id: "1:1" }] },
    },
    "https://api.figma.com/v1/files/FILEKEY/component_sets": {
      meta: { component_sets: [] },
    },
  });
  const reg = await extractComponentsFromFigma({
    fileKey: "FILEKEY",
    token: "figd_test",
    fetchImpl,
  });
  assert.equal(urls.length, 2);
  assert.ok(!urls.some((u) => u.includes("/nodes")));
  assert.equal(reg.components.length, 1);
});

test("extractVariablesFromFigma only hits /variables/local endpoint", async () => {
  const FIX = path.resolve("test/fixtures/figma-rest");
  const v = JSON.parse(await readFile(path.join(FIX, "variables-response.json"), "utf8"));
  const { fetchImpl, urls } = recordingFetch({
    "https://api.figma.com/v1/files/FILEKEY/variables/local": v,
  });
  const reg = await extractVariablesFromFigma({
    fileKey: "FILEKEY",
    token: "figd_test",
    fetchImpl,
  });
  assert.equal(urls.length, 1);
  assert.match(urls[0], /\/variables\/local$/);
  assert.equal(reg.variables.length, 1);
});

test("extractVariablesFromFigma throws VariablesEndpointUnavailableError on 403", async () => {
  const { VariablesEndpointUnavailableError } = await import("./figma-rest.js");
  const fetchImpl = (async () => {
    return {
      ok: false,
      status: 403,
      async json() {
        return {};
      },
    } as Response;
  }) as typeof fetch;
  await assert.rejects(
    () => extractVariablesFromFigma({ fileKey: "X", token: "t", fetchImpl }),
    (err: unknown) => err instanceof VariablesEndpointUnavailableError
  );
});

test("extractVariablesFromFigma throws VariablesEndpointUnavailableError on 404", async () => {
  const { VariablesEndpointUnavailableError } = await import("./figma-rest.js");
  const fetchImpl = (async () => {
    return {
      ok: false,
      status: 404,
      async json() {
        return {};
      },
    } as Response;
  }) as typeof fetch;
  await assert.rejects(
    () => extractVariablesFromFigma({ fileKey: "X", token: "t", fetchImpl }),
    (err: unknown) => err instanceof VariablesEndpointUnavailableError
  );
});

test("extractVariablesFromFigma rethrows other HTTP errors as generic Error", async () => {
  const fetchImpl = (async () => {
    return {
      ok: false,
      status: 500,
      async json() {
        return {};
      },
    } as Response;
  }) as typeof fetch;
  await assert.rejects(
    () => extractVariablesFromFigma({ fileKey: "X", token: "t", fetchImpl }),
    /failed: 500/
  );
});

test("extractTextStylesFromFigma only hits /styles endpoint", async () => {
  const FIX = path.resolve("test/fixtures/figma-rest");
  const s = JSON.parse(await readFile(path.join(FIX, "styles-response.json"), "utf8"));
  const { fetchImpl, urls } = recordingFetch({
    "https://api.figma.com/v1/files/FILEKEY/styles": s,
  });
  const reg = await extractTextStylesFromFigma({
    fileKey: "FILEKEY",
    token: "figd_test",
    fetchImpl,
  });
  assert.equal(urls.length, 1);
  assert.match(urls[0], /\/styles$/);
  assert.equal(reg.styles.length, 1);
});
