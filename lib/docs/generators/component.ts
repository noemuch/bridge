// lib/docs/generators/component.ts
import { renderTemplate, registerAllHelpers } from "../templates/renderer.js";
import type { KbIndex } from "../../kb/index-builder.js";
import Handlebars from "handlebars";

registerAllHelpers();
// The renderer registers these, but extra safety here for module boot ordering:
if (!Handlebars.helpers.concat) {
  Handlebars.registerHelper("concat", (...args: unknown[]) => args.slice(0, -1).join(""));
}
if (!Handlebars.helpers.lookup) {
  Handlebars.registerHelper("lookup", (obj: any, key: string) => obj?.[key]);
}

export interface ComponentDocs {
  whenToUse?: string[];
  whenNotToUse?: string[];
  do?: Array<{ rule: string; source: string }>;
  dont?: Array<{ rule: string; source: string }>;
  accessibility?: string[];
  figmaUrl?: string;
  summary?: string;
}

export async function generateComponentDoc(opts: {
  entry: KbIndex["componentIndex"][string] & { name: string };
  docs: ComponentDocs;
  index: KbIndex;
  kbVersion: string;
  registriesHash: string;
  learningsHash?: string;
  existingMd?: string;
}): Promise<string> {
  const tokensTable = Object.entries(opts.index.tokenIndex)
    .filter(([, t]) => t.valuesByMode)
    .map(([ref, t]) => ({
      token: ref,
      light: String((t.valuesByMode as any)?.light ?? "—"),
      dark: String((t.valuesByMode as any)?.dark ?? "—"),
      usage: t.category,
    }));

  const ctx: Record<string, unknown> = {
    name: opts.entry.name,
    category: opts.entry.category,
    status: opts.entry.status,
    figma: opts.docs.figmaUrl,
    related: (opts.entry.alternatives.length || opts.entry.composesWith.length || opts.entry.supersedes.length)
      ? { alternatives: opts.entry.alternatives, composesWith: opts.entry.composesWith, supersedes: opts.entry.supersedes }
      : undefined,
    tokens: undefined,
    "generated-from": {
      "kb-version": opts.kbVersion,
      "registries-hash": opts.registriesHash,
      "learnings-hash": opts.learningsHash,
    },
    "last-regenerated": new Date().toISOString(),
    sources: {
      whenToUse: "cspec.docs.when_to_use",
      whenNotToUse: "cspec.docs.when_not_to_use",
      accessibility: `ai-inferred · confidence=0.85 · last-reviewed=${new Date().toISOString().slice(0, 10)}`,
    },
    summary: opts.docs.summary,
    whenToUse: opts.docs.whenToUse ?? ["(to be filled)"],
    whenNotToUse: opts.docs.whenNotToUse ?? [],
    props: [],
    variants: [],
    tokensTable,
    do: opts.docs.do ?? [],
    dont: opts.docs.dont ?? [],
    accessibility: opts.docs.accessibility ?? [],
    specPath: undefined,
    recipe: undefined,
    lastShip: undefined,
  };

  const rendered = await renderTemplate("component.md.hbs", ctx);
  if (opts.existingMd) {
    const { extractRegions, mergeRegions } = await import("../preservation.js");
    const saved = extractRegions(opts.existingMd);
    return mergeRegions(rendered, saved);
  }
  return rendered;
}
