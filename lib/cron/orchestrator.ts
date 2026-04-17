// lib/cron/orchestrator.ts
import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { extractFromFigma } from "../extractors/figma-rest.js";
import { parseDocsConfig } from "../config/docs-config.js";

export interface CronOptions {
  configPath: string;
}

export async function runCron(opts: CronOptions) {
  const raw = await readFile(opts.configPath, "utf8");
  const cfg = parseDocsConfig(raw);
  const token = process.env.FIGMA_TOKEN;
  if (!token) throw new Error("FIGMA_TOKEN env var is required");

  const extract = await extractFromFigma({ fileKey: cfg.figmaFileKey, token });

  const regDir = path.join(cfg.kbPath, "knowledge-base", "registries");
  await mkdir(regDir, { recursive: true });
  await writeFile(
    path.join(regDir, "variables.json"),
    JSON.stringify(extract.variables, null, 2) + "\n"
  );
  await writeFile(
    path.join(regDir, "components.json"),
    JSON.stringify(extract.components, null, 2) + "\n"
  );
  await writeFile(
    path.join(regDir, "text-styles.json"),
    JSON.stringify(extract.textStyles, null, 2) + "\n"
  );

  await mkdir(".bridge", { recursive: true });
  await writeFile(
    ".bridge/last-sync-report.md",
    `# Bridge KB sync — ${cfg.dsName}\n\nKB registries refreshed from Figma.\n`,
    "utf8"
  );

  return { extracted: true, dsName: cfg.dsName };
}

const invokedPath = process.argv[1] ?? "";
if (/[\\/]orchestrator\.(js|ts)$/.test(invokedPath)) {
  const configArgIdx = process.argv.indexOf("--config");
  const configPath = configArgIdx >= 0 ? process.argv[configArgIdx + 1] : "docs.config.yaml";
  runCron({ configPath })
    .then((r) => {
      console.log(JSON.stringify(r, null, 2));
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
