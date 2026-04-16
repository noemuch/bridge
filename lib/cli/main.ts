// lib/cli/main.ts
import { readFile } from "node:fs/promises";
import { initDocs } from "./init-docs.js";
import { doctor } from "./doctor.js";
import { extractHeadless } from "./extract.js";
import { build, sync, check } from "../docs/generate.js";
import { startMcpServer } from "../docs/mcp-server.js";
import { runCron } from "../cron/orchestrator.js";
import { parseDocsConfig } from "../config/docs-config.js";

const VERSION = "4.1.0";

async function loadCfg() {
  const raw = await readFile("docs.config.yaml", "utf8");
  return parseDocsConfig(raw);
}

function printHelp() {
  console.log(`
bridge-ds v${VERSION} — compiler-driven DS docs

Commands:
  init-docs              Bootstrap a repo (interactive)
  doctor                 Run diagnostics
  extract --headless     Extract DS via Figma REST (requires FIGMA_TOKEN)
  docs build             Full doc regeneration
  docs sync              Incremental cascade
  docs check             Lint without regen
  docs mcp               Launch MCP server (stdio)
  cron                   Run the cron orchestrator (CI-only)
  help | version
`);
}

export async function main() {
  const [cmd, sub, ...rest] = process.argv.slice(2);
  try {
    switch (cmd) {
      case "init-docs":
        await initDocs(VERSION);
        return;
      case "doctor":
        await doctor(VERSION);
        return;
      case "extract": {
        const headless = rest.includes("--headless") || sub === "--headless";
        if (!headless) throw new Error("Only headless extraction is CLI-exposed. Use `extract --headless`.");
        console.log(await extractHeadless({ configPath: "docs.config.yaml" }));
        return;
      }
      case "docs": {
        if (!["build", "sync", "check", "mcp"].includes(String(sub))) {
          throw new Error(`Unknown docs subcommand: ${sub}`);
        }
        const cfg = await loadCfg();
        const syncArgs = { kbPath: cfg.kbPath, docsPath: cfg.docsPath, dsName: cfg.dsName, tagline: cfg.tagline };
        switch (sub) {
          case "build": console.log(await build(syncArgs)); return;
          case "sync":  console.log(await sync(syncArgs)); return;
          case "check": console.log(await check({ docsPath: cfg.docsPath })); return;
          case "mcp":   await startMcpServer({ docsPath: cfg.docsPath, kbPath: cfg.kbPath }); return;
        }
        return;
      }
      case "cron":
        console.log(await runCron({ configPath: "docs.config.yaml" }));
        return;
      case "setup": {
        // Headless setup entry point — used by the extracting-design-system skill
        // via Bash dispatches. Takes flags: --ds-name, --figma-key, --docs-path, --kb-path.
        const args = new Map<string, string>();
        for (let i = 0; i < rest.length; i += 2) {
          const k = rest[i];
          if (k?.startsWith("--")) {
            args.set(k.slice(2), rest[i + 1] ?? "");
          }
        }
        const { scaffold } = await import("./setup-orchestrator.js");
        const created = await scaffold({
          dsName: args.get("ds-name") ?? "DS",
          figmaFileKey: args.get("figma-key") ?? "",
          docsPath: args.get("docs-path"),
          kbPath: args.get("kb-path"),
        });
        console.log(JSON.stringify({ scaffolded: created }, null, 2));
        return;
      }
      case "version":
      case "--version":
      case "-v":
        console.log(`bridge-ds v${VERSION}`);
        return;
      case "help":
      case "--help":
      case "-h":
      case undefined:
        printHelp();
        return;
      default:
        throw new Error(`Unknown command: ${cmd}`);
    }
  } catch (e) {
    console.error("Error:", (e as Error).message);
    process.exit(1);
  }
}

// CLI entry detection (CJS-compatible, no import.meta).
// When executed directly (node dist/lib/cli/main.js) process.argv[1] ends with main.js/main.ts.
// When required by bin/bridge.js the caller invokes main() explicitly.
const invokedPath = process.argv[1] ?? "";
if (/[\\/]main\.(js|ts)$/.test(invokedPath)) {
  main();
}
