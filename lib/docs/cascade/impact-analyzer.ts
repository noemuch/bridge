// lib/docs/cascade/impact-analyzer.ts
import type { KbIndex } from "../../kb/index-builder.js";
import type { Changeset } from "./diff-engine.js";

export interface Impact {
  componentsToRegen: string[];
  foundationsToRegen: string[];
  patternsToRegen: string[];
  changelogsToAppend: string[];
  migrations: Array<{ reason: string; from: string; to: string; severity: "breaking" | "deprecation" | "non-breaking" }>;
}

export function computeImpact(cs: Changeset, idx: KbIndex): Impact {
  const componentsToRegen = new Set<string>();
  const foundationsToRegen = new Set<string>();
  const patternsToRegen = new Set<string>();
  const changelogsToAppend = new Set<string>();
  const migrations: Impact["migrations"] = [];

  for (const vname of [...cs.variables.modified, ...cs.variables.added, ...cs.variables.removed]) {
    const ref = "$" + vname;
    const t = idx.tokenIndex[ref];
    if (t) {
      for (const c of t.usedBy) componentsToRegen.add(c);
      foundationsToRegen.add(t.category);
    }
  }

  for (const cname of [...cs.components.added, ...cs.components.modified]) {
    componentsToRegen.add(cname);
    changelogsToAppend.add(cname);
  }

  for (const cname of cs.components.removed) {
    changelogsToAppend.add(cname);
    migrations.push({ reason: "component-deprecation", from: cname, to: "", severity: "breaking" });
  }

  for (const r of cs.components.renamed) {
    migrations.push({ reason: "component-rename", from: r.from, to: r.to, severity: "breaking" });
    componentsToRegen.add(r.to);
    changelogsToAppend.add(r.to);
  }

  for (const r of cs.variables.renamed) {
    migrations.push({ reason: "token-rename", from: "$" + r.from, to: "$" + r.to, severity: "breaking" });
    const t = idx.tokenIndex["$" + r.from] || idx.tokenIndex["$" + r.to];
    if (t) for (const c of t.usedBy) componentsToRegen.add(c);
  }

  for (const [patternName, p] of Object.entries(idx.patternIndex)) {
    if (p.components.some((c) => componentsToRegen.has(c))) patternsToRegen.add(patternName);
  }

  return {
    componentsToRegen: [...componentsToRegen],
    foundationsToRegen: [...foundationsToRegen],
    patternsToRegen: [...patternsToRegen],
    changelogsToAppend: [...changelogsToAppend],
    migrations,
  };
}
