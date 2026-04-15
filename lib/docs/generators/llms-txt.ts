// lib/docs/generators/llms-txt.ts
import { renderTemplate } from "../templates/renderer.js";

export async function generateLlmsIndex(opts: {
  dsName: string;
  tagline: string;
  components: Array<{ name: string; path: string; summary: string }>;
  foundations: Array<{ name: string; path: string; summary: string }>;
  patterns?: Array<{ name: string; path: string }>;
}): Promise<string> {
  return renderTemplate("llms.txt.hbs", opts as unknown as Record<string, unknown>);
}

export function generateLlmsFull(mdContents: string[]): string {
  return mdContents.join("\n\n---\n\n");
}
