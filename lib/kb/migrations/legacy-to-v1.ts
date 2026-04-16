import { readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { CURRENT_KB_SCHEMA_VERSION } from "../schema-version.js";

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function stampFile(file: string): Promise<void> {
  if (!(await exists(file))) return;
  const raw = await readFile(file, "utf8");
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  await writeFile(file, JSON.stringify(stampVersion(parsed), null, 2) + "\n", "utf8");
}

interface LegacyComponents {
  components: Record<string, Array<Record<string, unknown>>>;
}

function flattenComponents(legacy: LegacyComponents): {
  version: number;
  generatedAt: string;
  components: Array<Record<string, unknown>>;
} {
  const flat: Array<Record<string, unknown>> = [];
  for (const [category, list] of Object.entries(legacy.components)) {
    for (const entry of list) {
      flat.push({ ...entry, category });
    }
  }
  return {
    version: CURRENT_KB_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    components: flat,
  };
}

function stampVersion<T extends Record<string, unknown>>(
  parsed: T
): T & { version: number; generatedAt: string } {
  return {
    ...parsed,
    version: CURRENT_KB_SCHEMA_VERSION,
    generatedAt: (parsed.generatedAt as string | undefined) ?? new Date().toISOString(),
  };
}

export async function migrateLegacyToV1(kbPath: string): Promise<void> {
  const regDir = path.join(kbPath, "knowledge-base", "registries");
  const compFile = path.join(regDir, "components.json");

  const compRaw = await readFile(compFile, "utf8");
  const compParsed = JSON.parse(compRaw) as LegacyComponents | { components: unknown[] };
  let compOut: unknown;
  if (Array.isArray((compParsed as { components: unknown[] }).components)) {
    compOut = stampVersion(compParsed as Record<string, unknown>);
  } else {
    compOut = flattenComponents(compParsed as LegacyComponents);
  }
  await writeFile(compFile, JSON.stringify(compOut, null, 2) + "\n", "utf8");

  await stampFile(path.join(regDir, "variables.json"));
  await stampFile(path.join(regDir, "text-styles.json"));
  await stampFile(path.join(regDir, "icons.json"));
  await stampFile(path.join(regDir, "logos.json"));
  await stampFile(path.join(regDir, "illustrations.json"));
}
