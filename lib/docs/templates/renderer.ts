import Handlebars from "handlebars";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { registerAllHelpers } from "./helpers.js";

export interface RenderContext { [key: string]: unknown; }

let HELPERS_REGISTERED = false;

export async function renderTemplate(templateName: string, context: RenderContext): Promise<string> {
  if (!HELPERS_REGISTERED) {
    registerAllHelpers();
    HELPERS_REGISTERED = true;
  }
  // In CJS build, __dirname is available. Fall back to cwd-based resolution if not.
  const here = typeof __dirname !== "undefined" ? __dirname : process.cwd();
  // When running from dist/, templates are in ../../lib/docs/templates/ source, copy into dist/ not automatic.
  // Resolve by walking up to the project root and reading from lib/docs/templates/.
  const candidates = [
    path.resolve(here, templateName),
    path.resolve(here, "..", "..", "..", "..", "lib/docs/templates", templateName),
    path.resolve(process.cwd(), "lib/docs/templates", templateName),
  ];
  let src: string | null = null;
  for (const c of candidates) {
    try { src = await readFile(c, "utf8"); break; } catch {}
  }
  if (src === null) throw new Error(`template not found: ${templateName} (tried ${candidates.join(", ")})`);
  const compile = Handlebars.compile(src);
  return compile(context);
}

export { registerAllHelpers };
