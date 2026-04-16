import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseDocsConfig } from "../config/docs-config.js";
import { extractFromFigma } from "../extractors/figma-rest.js";

export interface ExtractOptions {
  configPath?: string;
  output?: string;
}

export async function extractHeadless(opts: ExtractOptions = {}) {
  const cfgPath = opts.configPath ?? "docs.config.yaml";
  const raw = await readFile(cfgPath, "utf8");
  const cfg = parseDocsConfig(raw);
  const token = process.env.FIGMA_TOKEN;
  if (!token) throw new Error("FIGMA_TOKEN env var is required");

  const result = await extractFromFigma({ fileKey: cfg.figmaFileKey, token });
  const outBase = opts.output ?? path.join(cfg.kbPath, "knowledge-base");
  await mkdir(path.join(outBase, "registries"), { recursive: true });
  await writeFile(
    path.join(outBase, "registries", "variables.json"),
    JSON.stringify(result.variables, null, 2) + "\n"
  );
  await writeFile(
    path.join(outBase, "registries", "components.json"),
    JSON.stringify(result.components, null, 2) + "\n"
  );
  await writeFile(
    path.join(outBase, "registries", "text-styles.json"),
    JSON.stringify(result.textStyles, null, 2) + "\n"
  );

  return {
    variables: result.variables.variables.length,
    components: result.components.components.length,
    textStyles: result.textStyles.styles.length,
  };
}
