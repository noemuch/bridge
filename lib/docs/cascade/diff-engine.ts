// lib/docs/cascade/diff-engine.ts
import { detectRenames, type Namable } from "./rename-detector.js";
import { sha256 } from "../../kb/hash.js";

export interface KbSnapshot {
  components: Array<Namable & { [k: string]: unknown }>;
  variables:  Array<Namable & { valuesByMode?: unknown; [k: string]: unknown }>;
  textStyles: Array<Namable & { [k: string]: unknown }>;
}

export interface Changeset {
  components: { added: string[]; modified: string[]; removed: string[]; renamed: Array<{ from: string; to: string }> };
  variables:  { added: string[]; modified: string[]; removed: string[]; renamed: Array<{ from: string; to: string }> };
  textStyles: { added: string[]; modified: string[]; removed: string[]; renamed: Array<{ from: string; to: string }> };
}

function diffSet<T extends Namable>(oldItems: T[], newItems: T[]): Changeset["components"] {
  const renameResult = detectRenames(oldItems, newItems);
  const modified: string[] = [];
  const byKeyNew = new Map<string, T>();
  for (const n of newItems) byKeyNew.set(n.key, n);
  for (const o of oldItems) {
    const n = byKeyNew.get(o.key);
    if (!n) continue;
    if (n.name !== o.name) continue; // counted as renamed
    if (sha256(o) !== sha256(n)) modified.push(n.name);
  }
  return {
    added: renameResult.added.map((x) => x.name),
    removed: renameResult.removed.map((x) => x.name),
    renamed: renameResult.renamed.map((r) => ({ from: r.from.name, to: r.to.name })),
    modified,
  };
}

export function diffKb(oldKb: KbSnapshot, newKb: KbSnapshot): Changeset {
  return {
    components: diffSet(oldKb.components, newKb.components),
    variables:  diffSet(oldKb.variables, newKb.variables),
    textStyles: diffSet(oldKb.textStyles, newKb.textStyles),
  };
}
