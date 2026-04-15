// lib/cron/orchestrator.ts
import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { extractFromFigma } from "../extractors/figma-rest.js";
import { sync } from "../docs/generate.js";
import { parseDocsConfig } from "../config/docs-config.js";

export interface CronOptions {
  configPath: string;
}

export async function runCron(opts: CronOptions) {
  const raw = await readFile(opts.configPath, "utf8");
  const cfg = parseDocsConfig(raw);
  const token = process.env.FIGMA_TOKEN;
  if (!token) throw new Error("FIGMA_TOKEN env var is required");

  // 1. Extract from Figma REST
  const extract = await extractFromFigma({ fileKey: cfg.figmaFileKey, token });

  // 2. Persist registries to KB
  const regDir = path.join(cfg.kbPath, "knowledge-base", "registries");
  await mkdir(regDir, { recursive: true });
  await writeFile(path.join(regDir, "variables.json"),   JSON.stringify(extract.variables, null, 2) + "\n");
  await writeFile(path.join(regDir, "components.json"),  JSON.stringify(extract.components, null, 2) + "\n");
  await writeFile(path.join(regDir, "text-styles.json"), JSON.stringify(extract.textStyles, null, 2) + "\n");

  // 3. Run the docs sync pipeline
  const report = await sync({ kbPath: cfg.kbPath, docsPath: cfg.docsPath, dsName: cfg.dsName, tagline: cfg.tagline });

  // 4. Write a PR body to .bridge/last-sync-report.md
  await mkdir(".bridge", { recursive: true });
  const body = formatReport(report, cfg.dsName);
  await writeFile(".bridge/last-sync-report.md", body, "utf8");

  return report;
}

function formatReport(report: Awaited<ReturnType<typeof sync>>, dsName: string): string {
  if (report.noDiff) return `# 🤖 Bridge Docs — ${dsName} sync\n\n✅ No changes detected. No PR needed.\n`;
  const lines: string[] = [];
  lines.push(`# 🤖 Bridge Docs — ${dsName} sync`);
  lines.push("");
  lines.push(`## Regenerated (${report.regenerated.length})`);
  for (const r of report.regenerated) lines.push(`- \`${r}\``);
  if (report.migrations.length > 0) {
    lines.push("");
    lines.push(`## Migrations (${report.migrations.length})`);
    for (const m of report.migrations) lines.push(`- ${m}`);
  }
  lines.push("");
  lines.push(`## Doc linter`);
  lines.push(`- ${report.lintIssues === 0 ? "✅" : "⚠️"} ${report.lintIssues} issues`);
  return lines.join("\n") + "\n";
}

// CLI entry for the compiled dist/ module.
// Detects direct invocation via process.argv[1] filename match (works under both
// CommonJS and ESM emit; avoids `import.meta` which is ESM-only under NodeNext).
const invokedPath = process.argv[1] ?? "";
if (/[\\/]orchestrator\.(js|ts)$/.test(invokedPath)) {
  const configArgIdx = process.argv.indexOf("--config");
  const configPath = configArgIdx >= 0 ? process.argv[configArgIdx + 1] : "docs.config.yaml";
  runCron({ configPath }).then((r) => {
    console.log(JSON.stringify(r, null, 2));
  }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
