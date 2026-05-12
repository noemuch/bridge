// lib/lint/engine.ts
import { Spectral, Document } from "@stoplight/spectral-core";
import * as functions from "@stoplight/spectral-functions";
import { Json as JsonParser } from "@stoplight/spectral-parsers";
import type { RuleDef, LintDiagnostic, LintResult } from "./types.js";
import type { Category, Severity } from "@noemuch/bridge-ds-rule-api";
import { BRIDGE_BUILTIN_STUBS } from "./builtin-functions.js";

interface RunOptions {
  readonly source: string;
}

// In rulesets, the rule `id` is the record key, so callers may omit it from the
// value object. We normalize to a full RuleDef internally.
type RuleInput = Omit<RuleDef, "id"> & { readonly id?: string };

const SPECTRAL_SEVERITY: Record<Severity, number> = {
  off: -1,
  hint: 3,
  info: 2,
  warn: 1,
  error: 0,
};

// TODO(v7.1): generate a typed function registry from @stoplight/spectral-functions
// so RuleDef['then']['function'] can be a typed union (BuiltinFunctionId | (string & {})).
// Today we resolve dynamically via string name; unknown names throw.
const BUILTIN_FUNCTIONS = functions as unknown as Record<string, unknown>;

function resolveFunction(name: string): unknown {
  // 1. Bridge built-in stubs (custom functions referenced by bridge:recommended).
  //    These fail OPEN — they emit no diagnostics and warn once per name — so
  //    consumers can extend the recommended preset without crashing on
  //    "Unknown function" before real implementations land.
  const stub = BRIDGE_BUILTIN_STUBS[name];
  if (typeof stub === "function") {
    return stub;
  }

  // 2. Stoplight built-in functions (truthy, pattern, schema, ...).
  const fn = BUILTIN_FUNCTIONS[name];
  if (typeof fn !== "function") {
    throw new Error(
      `Unknown Spectral function "${name}". Built-in functions: ${Object.keys(
        BUILTIN_FUNCTIONS
      )
        .filter((k) => typeof BUILTIN_FUNCTIONS[k] === "function")
        .concat(Object.keys(BRIDGE_BUILTIN_STUBS))
        .join(", ")}.`
    );
  }
  return fn;
}

function toCategory(rule: RuleInput): Category {
  return rule.meta.category;
}

export async function runRulesAgainstDocument(
  ruleset: { rules: Record<string, RuleInput> },
  document: unknown,
  opts: RunOptions
): Promise<LintResult> {
  const spectral = new Spectral();
  const spectralRuleset: Record<string, unknown> = {};

  for (const [id, rule] of Object.entries(ruleset.rules)) {
    // Filter `off` rules before handing to Spectral. Spectral's severity -1 is
    // undefined behavior — it may still execute rules. Skipping here is the
    // only safe way to disable a rule.
    if (rule.severity === "off") continue;
    spectralRuleset[id] = {
      description: rule.description,
      given: rule.given,
      then: {
        ...(rule.then.field !== undefined ? { field: rule.then.field } : {}),
        function: resolveFunction(rule.then.function),
        functionOptions: rule.then.functionOptions,
      },
      severity: SPECTRAL_SEVERITY[rule.severity],
    };
  }

  spectral.setRuleset({
    rules: spectralRuleset as never,
  } as never);

  const doc = new Document(JSON.stringify(document), JsonParser, opts.source);
  // Defensive try/catch: the input is already a JS object that we JSON.stringify
  // ourselves, so the JSON parser should never throw in practice. We still wrap
  // to surface any future parser-source errors as structured diagnostics rather
  // than raw exceptions. Hard to unit-test without mocking.
  let spectralResults;
  try {
    spectralResults = await spectral.run(doc);
  } catch (err) {
    return {
      diagnostics: [
        {
          ruleId: "lint-engine/parse-error",
          severity: "error",
          category: "structure",
          message: `Failed to parse document: ${
            err instanceof Error ? err.message : String(err)
          }`,
          path: [],
          source: opts.source,
        },
      ],
      coverage: {
        byCategory: {} as never,
        overall: {
          passed: 0,
          failed: 1,
          total: Object.keys(ruleset.rules).length,
        },
      },
    };
  }

  const diagnostics: LintDiagnostic[] = [];
  for (const r of spectralResults) {
    const ruleId = r.code as string;
    const rule = ruleset.rules[ruleId];
    // Spectral may emit diagnostics for internal/alias rules we don't own
    // (e.g. when ruleset composition expands a rule). Guard against undefined.
    if (!rule) continue;
    diagnostics.push({
      ruleId,
      severity: rule.severity,
      category: toCategory(rule),
      message: r.message,
      path: r.path as never,
      source: opts.source,
    });
  }

  const total = Object.keys(ruleset.rules).length;
  const failed = new Set(diagnostics.map((d) => d.ruleId)).size;
  return {
    diagnostics,
    coverage: {
      byCategory: {} as never, // computed later in coverage.ts
      overall: { passed: total - failed, failed, total },
    },
  };
}
