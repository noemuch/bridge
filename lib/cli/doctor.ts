import { access } from "node:fs/promises";
import { brand, icons } from "./ui.js";
import { printBanner } from "./banner.js";
import { readState } from "../docs/state.js";

export async function doctor(version = "4.0.0") {
  if (process.stdout.isTTY && !process.env.CI) printBanner("Diagnostic", version);

  console.log(brand("Environment"));
  console.log(`  ${icons.pass} Node.js ${process.versions.node}`);
  try { await access(".git"); console.log(`  ${icons.pass} Git repo detected`); }
  catch { console.log(`  ${icons.fail} Not a git repo`); }
  console.log(`  ${icons.pass} @noemuch/bridge-ds ${version}`);

  console.log(brand("Configuration"));
  try { await access("docs.config.yaml"); console.log(`  ${icons.pass} docs.config.yaml`); }
  catch { console.log(`  ${icons.fail} docs.config.yaml missing`); }
  try { await access("bridge-ds/knowledge-base/registries/components.json"); console.log(`  ${icons.pass} knowledge base registries`); }
  catch { console.log(`  ${icons.warn} no registries yet — run setup`); }

  console.log(brand("Connectivity"));
  const token = process.env.FIGMA_TOKEN;
  if (!token) console.log(`  ${icons.warn} FIGMA_TOKEN env var not set (ok for local, required in CI)`);
  else console.log(`  ${icons.pass} FIGMA_TOKEN set`);

  console.log(brand("Docs health"));
  try {
    const state = await readState(".");
    if (state.lastSyncAt) console.log(`  ${icons.pass} Last sync: ${state.lastSyncAt}`);
    else console.log(`  ${icons.warn} No sync yet`);
  } catch {
    console.log(`  ${icons.warn} No docs-state.json`);
  }

  console.log(brand("Cron"));
  try { await access(".github/workflows/bridge-docs-cron.yml"); console.log(`  ${icons.pass} bridge-docs-cron.yml installed`); }
  catch { console.log(`  ${icons.warn} cron workflow missing`); }
}
