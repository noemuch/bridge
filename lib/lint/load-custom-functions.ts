// lib/lint/load-custom-functions.ts
// Discover and load consumer-side custom Spectral functions from a directory.
// Supports both *.ts (via runtime require — works for CJS, doesn't compile TS)
// and *.js (post-compiled or hand-authored).
//
// In practice consumers either:
// - Author in TS and run `tsc` themselves, then point functionsDir at the dist
// - Author in plain JS at the path directly
// - (Future) we can add ts-node here for transparent .ts support.
import { readdir, access } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { BridgeFunctionDefinition } from "@noemuch/bridge-ds-rule-api";

export type LoadedFunction = { name: string; fn: (...args: unknown[]) => unknown };

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export async function loadCustomFunctions(
  functionsDir: string | undefined
): Promise<LoadedFunction[]> {
  if (!functionsDir) return [];
  const abs = resolve(functionsDir);
  if (!(await fileExists(abs))) return [];

  const out: LoadedFunction[] = [];
  let entries: string[];
  try {
    entries = await readdir(abs);
  } catch {
    return [];
  }

  for (const entry of entries) {
    const ext = extname(entry);
    if (ext !== ".js" && ext !== ".mjs" && ext !== ".cjs") {
      // Skip .ts files — consumers must pre-compile. Log a hint.
      if (ext === ".ts") {
        console.warn(
          `[bridge-ds lint] Skipping ${entry} — TS files must be pre-compiled. Run \`tsc\` and point functionsDir at the dist, or rename to .js.`
        );
      }
      continue;
    }
    const fullPath = join(abs, entry);
    try {
      const mod = await import(pathToFileURL(fullPath).href);
      const def = (mod.default ?? mod) as BridgeFunctionDefinition | undefined;
      if (!def || typeof def !== "object" || typeof def.fn !== "function") {
        console.warn(
          `[bridge-ds lint] ${entry} did not export a default BridgeFunctionDefinition; skipping.`
        );
        continue;
      }
      out.push({ name: def.name, fn: def.fn as never });
    } catch (err) {
      console.warn(
        `[bridge-ds lint] Failed to load function from ${entry}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  return out;
}
