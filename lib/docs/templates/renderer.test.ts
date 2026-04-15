import { test } from "node:test";
import assert from "node:assert/strict";
import { registerAllHelpers } from "./renderer.js";

test("registerAllHelpers exposes Handlebars", () => {
  registerAllHelpers();
  const Hb = (globalThis as any).__bridgeHandlebars;
  assert.ok(Hb, "Handlebars must be exposed globally for introspection");
  assert.ok(Hb.helpers.eq);
  assert.ok(Hb.helpers.formatDate);
  assert.ok(Hb.helpers.provenanceMarker);
  assert.ok(Hb.helpers.manualRegion);
  assert.ok(Hb.helpers.concat);
});

test("formatDate helper renders YYYY-MM-DD", () => {
  registerAllHelpers();
  const Hb = (globalThis as any).__bridgeHandlebars;
  const tpl = Hb.compile("{{formatDate iso}}");
  assert.equal(tpl({ iso: "2026-04-15T06:00:00Z" }), "2026-04-15");
});

test("provenanceMarker emits comment", () => {
  registerAllHelpers();
  const Hb = (globalThis as any).__bridgeHandlebars;
  const tpl = Hb.compile("{{{provenanceMarker src}}}");
  assert.equal(tpl({ src: "learning#5" }), "<!-- source: learning#5 -->");
});
