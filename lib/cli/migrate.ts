import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { CURRENT_KB_SCHEMA_VERSION, KBSchemaError } from "../kb/schema-version.js";
import { migrateLegacyToV1 } from "../kb/migrations/legacy-to-v1.js";

export interface MigrateOptions {
  kbPath: string;
}

export interface MigrateResult {
  migrated: boolean;
  from: "legacy-grouped" | "current";
  to: number;
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function detectShape(
  kbPath: string
): Promise<"legacy-grouped" | "current" | "corrupt" | "newer"> {
  const file = path.join(kbPath, "knowledge-base", "registries", "components.json");
  if (!(await exists(file))) return "corrupt";
  const raw = await readFile(file, "utf8");
  let parsed: { components?: unknown; version?: number };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return "corrupt";
  }
  if (Array.isArray(parsed.components)) {
    const v = typeof parsed.version === "number" ? parsed.version : 1;
    if (v > CURRENT_KB_SCHEMA_VERSION) return "newer";
    return "current";
  }
  if (parsed.components && typeof parsed.components === "object") return "legacy-grouped";
  return "corrupt";
}

export async function migrate(opts: MigrateOptions): Promise<MigrateResult> {
  const shape = await detectShape(opts.kbPath);
  if (shape === "newer") {
    throw new KBSchemaError(
      `KB schema is newer than this CLI supports (max ${CURRENT_KB_SCHEMA_VERSION}). Upgrade @noemuch/bridge-ds.`,
      "newer"
    );
  }
  if (shape === "corrupt") {
    throw new KBSchemaError(
      `KB at ${opts.kbPath} has an unrecognized shape or is missing. Re-run 'setup bridge'.`,
      "corrupt"
    );
  }
  if (shape === "current") {
    return { migrated: false, from: "current", to: CURRENT_KB_SCHEMA_VERSION };
  }
  await migrateLegacyToV1(opts.kbPath);
  return { migrated: true, from: "legacy-grouped", to: CURRENT_KB_SCHEMA_VERSION };
}
