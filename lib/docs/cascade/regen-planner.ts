// lib/docs/cascade/regen-planner.ts
import type { Impact } from "./impact-analyzer.js";
import type { KbIndex } from "../../kb/index-builder.js";

export interface PlannedWrite {
  path: string;
  kind: "component" | "foundation" | "pattern" | "changelog" | "migration";
  target: string;
}

export function planRegens(impact: Impact, idx: KbIndex, docsPath: string): PlannedWrite[] {
  const writes: PlannedWrite[] = [];
  for (const f of impact.foundationsToRegen) {
    writes.push({ kind: "foundation", target: f, path: `${docsPath}/foundations/${f}.md` });
  }
  for (const c of impact.componentsToRegen) {
    const entry = idx.componentIndex[c];
    const cat = entry?.category ?? "layout";
    writes.push({ kind: "component", target: c, path: `${docsPath}/components/${cat}/${c}.md` });
  }
  for (const p of impact.patternsToRegen) {
    writes.push({ kind: "pattern", target: p, path: `${docsPath}/patterns/${p}.md` });
  }
  for (const c of impact.changelogsToAppend) {
    writes.push({ kind: "changelog", target: c, path: `${docsPath}/changelog/components/${c}.md` });
  }
  for (const m of impact.migrations) {
    const slug = `${m.reason}-${m.from.replace(/[^a-zA-Z0-9]/g, "-")}`;
    writes.push({ kind: "migration", target: `${m.from}→${m.to}`, path: `${docsPath}/changelog/migrations/${slug}.md` });
  }
  return writes;
}
