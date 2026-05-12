// lib/lint/loader.ts
import { readFile, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { load as yamlLoad, JSON_SCHEMA } from "js-yaml";
import type { LintConfig, RuleDef } from "./types.js";

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return false;
    throw err; // surface EACCES, EIO, etc.
  }
}

async function loadYaml<T>(p: string): Promise<T> {
  const raw = await readFile(p, "utf-8");
  return yamlLoad(raw, { schema: JSON_SCHEMA }) as T;
}

/**
 * Load a lint config file. Returns null if the file does not exist
 * (engine is then dormant — opt-in via presence of config).
 *
 * Resolves `extends` chains recursively. Later configs override earlier.
 */
export async function loadConfig(configPath: string): Promise<LintConfig | null> {
  return loadConfigInner(configPath, new Set());
}

async function loadConfigInner(
  configPath: string,
  seen: Set<string>
): Promise<LintConfig | null> {
  const absPath = resolve(configPath);
  if (seen.has(absPath)) {
    throw new Error(
      `Lint config cycle detected via ${absPath} (chain: ${[...seen].join(" -> ")})`
    );
  }
  if (!(await fileExists(absPath))) return null;
  seen.add(absPath);

  const raw = await loadYaml<LintConfig>(absPath);
  const baseDir = dirname(absPath);
  const resolved: { rules: Record<string, RuleDef | "off"> } = { rules: {} };

  for (const ext of raw.extends ?? []) {
    let extPath: string;
    if (ext.startsWith("bridge:")) {
      const preset = ext.slice("bridge:".length);
      extPath = resolve(__dirname, "builtin/_rulesets", `${preset}.yaml`);
    } else {
      extPath = resolve(baseDir, ext);
    }
    const sub = await loadConfigInner(extPath, seen);
    if (sub === null) {
      // Surface missing extends — easier debugging than silent no-op.
      if (ext.startsWith("bridge:")) {
        console.warn(
          `[bridge-ds lint] Preset not found: ${ext} (expected at ${extPath}). This is expected during the v7.0 build before Task 10 ships the builtin presets.`
        );
      } else {
        throw new Error(
          `Lint config extends missing file: ${ext} (resolved to ${extPath})`
        );
      }
      continue;
    }
    if (sub.rules) Object.assign(resolved.rules, sub.rules);
  }
  Object.assign(resolved.rules, raw.rules ?? {});

  return { ...raw, rules: resolved.rules };
}
