// lib/docs/generators/pattern.ts
import { renderTemplate } from "../templates/renderer.js";

export async function generatePatternDoc(opts: {
  name: string;
  title: string;
  description: string;
  components: string[];
  recipes: string[];
}): Promise<string> {
  return renderTemplate("pattern.md.hbs", {
    name: opts.name,
    title: opts.title,
    description: opts.description,
    components: opts.components,
    recipes: opts.recipes,
    "last-regenerated": new Date().toISOString(),
  });
}
