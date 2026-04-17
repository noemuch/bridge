// lib/cli/main.ts
import { doctor } from "./doctor.js";
import { extractHeadless } from "./extract.js";
import { runCron } from "../cron/orchestrator.js";
import { migrate } from "./migrate.js";

export const VERSION = "5.1.0";

function printHelp() {
  console.log(`
bridge-ds v${VERSION} — compiler-driven design system

Commands:
  setup                  Headless scaffold (typically invoked by 'setup bridge' in Claude Code)
  compile                Compile a scene graph JSON via the local compiler
  doctor                 Run diagnostics (config, connectivity, health)
  extract --headless     Extract DS via Figma REST (requires FIGMA_TOKEN)
  migrate                Migrate a legacy KB to the current schema
  cron                   Run the cron orchestrator (CI entry point)
  help | version
`);
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
      case "doctor":
        await doctor(VERSION);
        return;
      case "extract": {
        const headless = rest.includes("--headless") || sub === "--headless";
        if (!headless)
          throw new Error("Only headless extraction is CLI-exposed. Use `extract --headless`.");
        console.log(await extractHeadless({ configPath: "docs.config.yaml" }));
        return;
      }
      case "cron":
        console.log(await runCron({ configPath: "docs.config.yaml" }));
        return;
      case "migrate": {
        const args = parseFlags([sub, ...rest]);
        const kbPath = args.get("kb-path") ?? ".";
        const result = await migrate({ kbPath });
        console.log(JSON.stringify(result, null, 2));
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
