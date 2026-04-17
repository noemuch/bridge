// lib/cli/setup-orchestrator.ts
import { mkdir, writeFile } from "node:fs/promises";
import { detectFigmaFileKey, detectGitRemote } from "../kb/auto-detect.js";
import {
  setGitHubSecret,
  validateFigmaToken,
  probeVariablesEndpoint,
  maskToken,
} from "./token-handling.js";
import { VERSION } from "./main.js";

export interface SetupOrchestratorOptions {
  dsName: string;
  figmaFileKey: string;
  kbPath?: string;
  figmaToken?: string;
  githubRepo?: string;
  cronCadence?: "daily" | "weekly";
  cronTime?: string;
}

export interface SetupResult {
  scaffolded: string[];
  tokenStored: boolean;
  tokenValid: boolean;
  variablesAvailable: boolean;
  detectedGitRemote: string | null;
  detectedFigmaKey: string | null;
}

/**
 * Pre-flight: auto-detect what we can from the repo state.
 */
export async function runPreflight(): Promise<{
  gitRemote: string | null;
  figmaKey: string | null;
}> {
  const gitRemote = await detectGitRemote();
  const figmaKey = await detectFigmaFileKey();
  return { gitRemote, figmaKey };
}

/**
 * Write the scaffolding files: docs.config.yaml, cron workflow, and required
 * directory structure for KB-only Bridge v6.
 */
export async function scaffold(opts: SetupOrchestratorOptions): Promise<string[]> {
  const kbPath = opts.kbPath ?? "bridge-ds";
  const cadence = opts.cronCadence ?? "daily";
  const time = opts.cronTime ?? "06:00";

  const created: string[] = [];

  for (const dir of [
    `${kbPath}/knowledge-base/registries`,
    `${kbPath}/knowledge-base/recipes`,
    ".bridge",
    ".github/workflows",
  ]) {
    await mkdir(dir, { recursive: true });
    created.push(dir + "/");
  }

  const configYaml = `dsName: "${opts.dsName}"\nfigmaFileKey: "${opts.figmaFileKey}"\nkbPath: "${kbPath}"\ncron:\n  cadence: "${cadence}"\n  time: "${time}"\n`;
  await writeFile("docs.config.yaml", configYaml, "utf8");
  created.push("docs.config.yaml");

  const cronYaml = `name: Bridge KB — Daily Sync

on:
  schedule:
    - cron: "0 6 * * *"
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Run Bridge KB sync
        env:
          FIGMA_TOKEN: \${{ secrets.FIGMA_TOKEN }}
        run: npx -y @noemuch/bridge-ds@${VERSION} cron --config docs.config.yaml
      - name: Open PR if changes
        uses: peter-evans/create-pull-request@v6
        with:
          commit-message: "chore: Bridge KB daily sync"
          branch: bridge-kb/cron-sync
          title: "Bridge KB sync"
          body-path: .bridge/last-sync-report.md
          delete-branch: true
          labels: bridge-kb, automated
`;
  await writeFile(".github/workflows/bridge-kb-cron.yml", cronYaml, "utf8");
  created.push(".github/workflows/bridge-kb-cron.yml");

  return created;
}

/**
 * Store the Figma token in GitHub Secrets. Uses stdin pipe (no argv leak).
 * Probe also executed if a file key is provided to advertise Enterprise vs Pro.
 */
export async function storeTokenInGitHubSecret(opts: {
  token: string;
  repo: string;
  fileKey?: string;
}): Promise<{ tokenValid: boolean; variablesAvailable: boolean }> {
  const tokenValid = await validateFigmaToken(opts.token);
  if (!tokenValid) {
    throw new Error(
      `Figma token ${maskToken(opts.token)} is invalid. Please regenerate on figma.com/settings/tokens.`
    );
  }

  let variablesAvailable = false;
  if (opts.fileKey) {
    try {
      const probeRes = await probeVariablesEndpoint(opts.token, opts.fileKey);
      variablesAvailable = probeRes === "ok";
    } catch {
      // probe failure is non-fatal
    }
  }

  await setGitHubSecret({
    name: "FIGMA_TOKEN",
    value: opts.token,
    repo: opts.repo,
  });

  return { tokenValid, variablesAvailable };
}
