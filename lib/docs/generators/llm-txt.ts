// lib/docs/generators/llm-txt.ts
import { renderTemplate, registerAllHelpers } from "../templates/renderer.js";
import type { KbIndex } from "../../kb/index-builder.js";
import Handlebars from "handlebars";

registerAllHelpers();
if (!Handlebars.helpers.concat) {
  Handlebars.registerHelper("concat", (...args: unknown[]) => args.slice(0, -1).join(""));
}

export interface LlmTxtDocs {
  summary?: string;
  whenToUse?: string[];
  dont?: Array<{ rule: string; source: string }>;
  props?: Array<{ name: string; type: string; default?: string | number | boolean }>;
  tokens?: {
    color?: string[];
    spacing?: string[];
    radius?: string[];
    text?: string[];
  };
}

export interface GenerateLlmTxtOptions {
  entry: KbIndex["componentIndex"][string] & { name: string };
  docs: LlmTxtDocs;
  since?: string;
}

export async function generateComponentLlmTxt(opts: GenerateLlmTxtOptions): Promise<string> {
  const related =
    opts.entry.alternatives.length > 0 || opts.entry.composesWith.length > 0
      ? {
          alternatives: opts.entry.alternatives,
          composesWith: opts.entry.composesWith,
        }
      : undefined;

  const ctx: Record<string, unknown> = {
    name: opts.entry.name,
    category: opts.entry.category,
    status: opts.entry.status,
    since: opts.since,
    summary: opts.docs.summary,
    whenToUse: opts.docs.whenToUse ?? [],
    dont: opts.docs.dont ?? [],
    props: opts.docs.props ?? [],
    tokens: opts.docs.tokens,
    related,
  };

  return renderTemplate("component.llm.txt.hbs", ctx);
}
