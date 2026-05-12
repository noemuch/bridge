// lib/lint/builtin-functions.ts
// Stub implementations for built-in custom Spectral functions referenced by
// the bridge:recommended preset. These return no diagnostics — rules using
// them fail OPEN (silent pass) until real implementations land.
//
// To opt out of stub behaviour and enforce real checks, consumers should
// either implement the function themselves and reference it via their
// own functionsDir, or set the rule's severity to `off` in their config.

import type { RulesetFunction } from "@stoplight/spectral-core";

type StubFunction = RulesetFunction<unknown, unknown>;

const warnedOnce = new Set<string>();
function warnOnce(name: string): void {
  if (warnedOnce.has(name)) return;
  warnedOnce.add(name);
  console.warn(
    `[bridge-ds lint] custom function "${name}" is a v7.0 stub — rule will not fire until the real implementation lands. Set rule severity to "off" to silence.`
  );
}

function makeStub(name: string): StubFunction {
  const fn: StubFunction = () => {
    warnOnce(name);
    return undefined;
  };
  Object.defineProperty(fn, "name", { value: name });
  return fn;
}

export const BRIDGE_BUILTIN_STUBS: Record<string, StubFunction> = {
  "token-exists-in-kb": makeStub("token-exists-in-kb"),
  "token-not-deprecated": makeStub("token-not-deprecated"),
  "text-is-english": makeStub("text-is-english"),
  "snapshot-exists": makeStub("snapshot-exists"),
  "ship-bundle-complete": makeStub("ship-bundle-complete"),
  "filename-pattern": makeStub("filename-pattern"),
  "property-key-has-figma-suffix": makeStub("property-key-has-figma-suffix"),
  "interaction-token-is-float": makeStub("interaction-token-is-float"),
  "recipe-eligible": makeStub("recipe-eligible"),
  "rule-has-bridge-api": makeStub("rule-has-bridge-api"),
};
