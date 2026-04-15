// lib/docs/generators/foundation.ts
import { renderTemplate } from "../templates/renderer.js";

export interface FoundationTokenRow {
  name: string;
  light: string;
  dark: string;
  scopes: string[];
}

export async function generateFoundationDoc(opts: {
  category: string;
  title: string;
  summary: string;
  tokens?: FoundationTokenRow[];
  scale?: Array<{ name: string; value: string | number }>;
  since?: string;
}): Promise<string> {
  const ctx = {
    name: opts.title.toLowerCase().replace(/\s+/g, "-"),
    title: opts.title,
    category: opts.category,
    since: opts.since,
    summary: opts.summary,
    tokens: opts.tokens,
    scale: opts.scale,
    "last-regenerated": new Date().toISOString(),
  };
  return renderTemplate("foundation.md.hbs", ctx);
}
