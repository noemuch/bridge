// lib/cli/main.ts
import { readFile } from "node:fs/promises";
import { initDocs } from "./init-docs.js";
import { doctor } from "./doctor.js";
import { extractHeadless } from "./extract.js";
import { build, sync, check } from "../docs/generate.js";
import { startMcpServer } from "../docs/mcp-server.js";
import { runCron } from "../cron/orchestrator.js";
import { parseDocsConfig } from "../config/docs-config.js";

export const VERSION = "5.0.0";

async function loadCfg() {
  const raw = await readFile("docs.config.yaml", "utf8");
  return parseDocsConfig(raw);
}

function printHelp() {
  console.log(`
bridge-ds v${VERSION} — compiler-driven design system

Commands:
  setup                  Headless scaffold (typically invoked by 'setup bridge' in Claude Code)
  compile                Compile a scene graph JSON via the local compiler
  docs build             Full doc regeneration from the knowledge base
  docs sync              Incremental cascade when Figma drifts
  docs check             Lint without regenerating
  docs mcp               Launch the MCP server (stdio, ds:// URIs)
  doctor                 Run diagnostics (config, connectivity, health)
  extract --headless     Extract DS via Figma REST (requires FIGMA_TOKEN)
  cron                   Run the cron orchestrator (CI entry point)
  init-docs              Interactive docs bootstrap (deprecated — use 'setup bridge' in Claude Code)
  help | version
`);
}

function deprecationNotice(replacement: string) {
  console.error(`\n  \x1b[33m!\x1b[0m This command was removed in v5.0.0.`);
  console.error(`    Use: \x1b[36m${replacement}\x1b[0m\n`);
  process.exit(1);
}

export async function main() {
  const [cmd, sub, ...rest] = process.argv.slice(2);
  try {
    switch (cmd) {
      case "setup": {
        const args = parseFlags(rest);
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
      case "compile": {
        const { runCompileCli } = await import("../compiler/cli.js");
        await runCompileCli([sub, ...rest].filter((x): x is string => typeof x === "string"));
        return;
      }
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
      case "init":
        deprecationNotice("bridge-ds setup --ds-name <name> --figma-key <key>   (or 'setup bridge' in Claude Code)");
        return;
      case "update":
        deprecationNotice("re-install the plugin: /plugin update bridge-ds   (in Claude Code)");
        return;
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
    const err = e as Error;
    console.error(`Error: ${err.message}`);
    if (process.env.BRIDGE_DEBUG) console.error(err.stack);
    process.exit(1);
  }
}

function parseFlags(rest: readonly (string | undefined)[]): Map<string, string> {
  const args = new Map<string, string>();
  for (let i = 0; i < rest.length; i += 2) {
    const k = rest[i];
    if (k?.startsWith("--")) {
      args.set(k.slice(2), rest[i + 1] ?? "");
    }
  }
  return args;
}

const invokedPath = process.argv[1] ?? "";
if (/[\\/]main\.(js|ts)$/.test(invokedPath)) {
  main();
}
