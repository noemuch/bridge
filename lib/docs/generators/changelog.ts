// lib/docs/generators/changelog.ts
import { renderTemplate } from "../templates/renderer.js";

export interface ChangelogEntry {
  date: string;
  version: string;
  changes: Array<{ type: "Added" | "Changed" | "Fixed" | "Deprecated" | "Removed"; description: string }>;
}

export async function generateChangelogDoc(opts: { component: string; entries: ChangelogEntry[] }): Promise<string> {
  return renderTemplate("changelog.md.hbs", opts);
}
