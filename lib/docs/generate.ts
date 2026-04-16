// lib/docs/generate.ts
import path from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import {
  readComponentRegistry,
  readVariableRegistry,
  readTextStyleRegistry,
} from "../kb/registry-io.js";
import { buildFromScratch, type LearningsFile, type RecipesFile } from "../kb/index-builder.js";
import { sha256 } from "../kb/hash.js";
import { diffKb, type KbSnapshot } from "./cascade/diff-engine.js";
import { computeImpact } from "./cascade/impact-analyzer.js";
import { planRegens } from "./cascade/regen-planner.js";
import { generateComponentDoc } from "./generators/component.js";
import { generateFoundationDoc } from "./generators/foundation.js";
import { generatePatternDoc } from "./generators/pattern.js";
import { generateChangelogDoc } from "./generators/changelog.js";
import { generateMigrationDoc } from "./generators/migration.js";
import { generateLlmsIndex } from "./generators/llms-txt.js";
import { lintDoc, type LintIssue } from "./linter.js";
import { readState, writeState } from "./state.js";

type DocKind = "component" | "foundation" | "pattern";

export interface SyncReport {
  changed: number;
  regenerated: string[];
  migrations: string[];
  lintIssues: number;
  noDiff: boolean;
}

export interface SyncOptions {
  kbPath: string;
  docsPath: string;
  dsName: string;
  tagline?: string;
}

export async function sync(opts: SyncOptions): Promise<SyncReport> {
  const components = await readComponentRegistry(
    path.join(opts.kbPath, "knowledge-base/registries/components.json")
  );
  const variables = await readVariableRegistry(
    path.join(opts.kbPath, "knowledge-base/registries/variables.json")
  );
  const textStyles = await readTextStyleRegistry(
    path.join(opts.kbPath, "knowledge-base/registries/text-styles.json")
  );

  let learnings: LearningsFile;
  try {
    learnings = JSON.parse(
      await readFile(path.join(opts.kbPath, "knowledge-base/learnings.json"), "utf8")
    ) as LearningsFile;
  } catch {
    learnings = { learnings: [], flags: [] };
  }
  let recipes: RecipesFile;
  try {
    recipes = JSON.parse(
      await readFile(path.join(opts.kbPath, "knowledge-base/recipes/_index.json"), "utf8")
    ) as RecipesFile;
  } catch {
    recipes = { recipes: [] };
  }

  const registriesHash = sha256({ components, variables, textStyles });
  const learningsHash = sha256(learnings);

  const state = await readState(".");
  const noDiff = state.registriesHash === registriesHash && state.learningsHash === learningsHash;
  if (noDiff) return { changed: 0, regenerated: [], migrations: [], lintIssues: 0, noDiff: true };

  const idx = buildFromScratch({ components, variables, textStyles, learnings, recipes });

  // V0.1 bug fix (formalized in v4.1.0): on first run (no prior state), we want ALL entries
  // to appear as "added" in the diff, which requires the OLD snapshot to be empty and the NEW
  // snapshot to contain the current registries. The original code had the ternary inverted,
  // producing an empty changeset on first run (0 regenerated).
  const hasPriorState = Object.keys(state.perFileHashes).length > 0 || state.registriesHash !== "";
  // The diff engine requires a structural `Namable` shape with an open index
  // signature. Our registry types (ComponentEntry, VariableEntry, TextStyleEntry)
  // are shape-compatible but lack the explicit index signature; cast through
  // `unknown` keeps the conversion deliberate and honest.
  const oldSnapshot = {
    components: hasPriorState ? components.components : [],
    variables: hasPriorState ? variables.variables : [],
    textStyles: hasPriorState ? textStyles.styles : [],
  } as unknown as KbSnapshot;
  const newSnapshot = {
    components: components.components,
    variables: variables.variables,
    textStyles: textStyles.styles,
  } as unknown as KbSnapshot;
  const changeset = diffKb(oldSnapshot, newSnapshot);
  const impact = computeImpact(changeset, idx);
  const planned = planRegens(impact, idx, opts.docsPath);

  const regenerated: string[] = [];
  for (const w of planned) {
    await mkdir(path.dirname(w.path), { recursive: true });
    let existing: string | undefined;
    try {
      existing = await readFile(w.path, "utf8");
    } catch {}
    let content = "";
    if (w.kind === "component") {
      const entry = idx.componentIndex[w.target];
      if (!entry) continue;
      content = await generateComponentDoc({
        entry: { ...entry, name: w.target },
        docs: {},
        index: idx,
        kbVersion: idx.version,
        registriesHash,
        existingMd: existing,
      });
    } else if (w.kind === "foundation") {
      const tokens = Object.entries(idx.tokenIndex)
        .filter(([, t]) => t.category === w.target)
        .map(([ref]) => ({ name: ref.slice(1), light: "—", dark: "—", scopes: [] }));
      content = await generateFoundationDoc({
        category: w.target,
        title: w.target.charAt(0).toUpperCase() + w.target.slice(1),
        summary: "",
        tokens,
      });
    } else if (w.kind === "pattern") {
      const p = idx.patternIndex[w.target];
      if (!p) continue;
      content = await generatePatternDoc({
        name: w.target,
        title: w.target,
        description: "",
        components: p.components,
        recipes: p.recipes,
      });
    } else if (w.kind === "changelog") {
      content = await generateChangelogDoc({ component: w.target, entries: [] });
    } else if (w.kind === "migration") {
      const mig = impact.migrations.find((m) => `${m.from}→${m.to}` === w.target);
      if (!mig) continue;
      content = await generateMigrationDoc({
        reason: mig.reason,
        "reason-body": "Auto-generated by cascade.",
        date: new Date().toISOString(),
        from: mig.from,
        to: mig.to,
        severity: mig.severity,
        deprecatedAt: new Date().toISOString(),
        fromKbVersion: idx.version,
        toKbVersion: idx.version,
        affected: [],
        steps: [],
      });
    }
    await writeFile(w.path, content, "utf8");
    regenerated.push(w.path);

    // V4.1.0: emit per-component .llm.txt sidecar alongside .md
    if (w.kind === "component") {
      const llmPath = w.path.replace(/\.md$/, ".llm.txt");
      const { generateComponentLlmTxt } = await import("./generators/llm-txt.js");
      const compEntry = idx.componentIndex[w.target];
      if (compEntry) {
        const llmTxt = await generateComponentLlmTxt({
          entry: { ...compEntry, name: w.target },
          docs: {},
        });
        await writeFile(llmPath, llmTxt, "utf8");
        regenerated.push(llmPath);
      }
    }
  }

  // Regenerate llms.txt
  const componentsListing = Object.entries(idx.componentIndex).map(([name, c]) => ({
    name,
    path: `./${opts.docsPath}/components/${c.category}/${name}.md`,
    summary: "",
  }));
  const foundationsListing = ["color", "spacing", "radius", "text"].map((c) => ({
    name: c,
    path: `./${opts.docsPath}/foundations/${c}.md`,
    summary: "",
  }));
  const llmsTxt = await generateLlmsIndex({
    dsName: opts.dsName,
    tagline: opts.tagline ?? "",
    components: componentsListing,
    foundations: foundationsListing,
  });
  await writeFile("llms.txt", llmsTxt, "utf8");

  await writeState(".", {
    version: 1,
    registriesHash,
    learningsHash,
    lastSyncAt: new Date().toISOString(),
    perFileHashes: {},
  });

  // Lint pass
  let lintIssues = 0;
  for (const f of regenerated) {
    const content = String(await readFile(f, "utf8"));
    const kind: DocKind = f.includes("/components/")
      ? "component"
      : f.includes("/foundations/")
        ? "foundation"
        : "pattern";
    const res = lintDoc({
      path: f,
      content,
      kind,
      tokenIndex: idx.tokenIndex as Record<string, unknown>,
    });
    lintIssues += res.issues.length;
  }

  return {
    changed: regenerated.length,
    regenerated,
    migrations: impact.migrations.map((m) => `${m.reason}:${m.from}→${m.to}`),
    lintIssues,
    noDiff: false,
  };
}

export async function build(opts: SyncOptions): Promise<SyncReport> {
  // build = full regen. Force state reset then run sync.
  await writeState(".", { version: 1, registriesHash: "", learningsHash: "", perFileHashes: {} });
  return sync(opts);
}

export interface CheckReport {
  files: number;
  issues: number;
  report: Array<{ path: string; issues: LintIssue[] }>;
}

export async function check(opts: { docsPath: string }): Promise<CheckReport> {
  const { readdir } = await import("node:fs/promises");
  const report: CheckReport["report"] = [];
  async function walk(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    const files: string[] = [];
    for (const e of entries) {
      const p = path.join(dir, String(e.name));
      if (e.isDirectory()) files.push(...(await walk(p)));
      else if (e.isFile() && p.endsWith(".md")) files.push(p);
    }
    return files;
  }
  const all = await walk(opts.docsPath);
  let totalIssues = 0;
  for (const f of all) {
    const content = await readFile(f, "utf8");
    const kind: DocKind = f.includes("/components/")
      ? "component"
      : f.includes("/foundations/")
        ? "foundation"
        : "pattern";
    const r = lintDoc({ path: f, content, kind, tokenIndex: {} });
    if (r.issues.length > 0) {
      report.push(r);
      totalIssues += r.issues.length;
    }
  }
  return { files: all.length, issues: totalIssues, report };
}
