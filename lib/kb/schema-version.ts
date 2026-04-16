import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

export const CURRENT_KB_SCHEMA_VERSION = 1;

export class KBSchemaError extends Error {
  constructor(
    message: string,
    public readonly kind: "legacy" | "newer" | "corrupt" | "missing"
  ) {
    super(message);
    this.name = "KBSchemaError";
  }
}

type ShapeProbe = "current" | "legacy-grouped" | "corrupt";

function probeComponentsShape(parsed: unknown): ShapeProbe {
  if (!parsed || typeof parsed !== "object") return "corrupt";
  const obj = parsed as Record<string, unknown>;
  if (Array.isArray(obj.components)) return "current";
  if (obj.components && typeof obj.components === "object" && !Array.isArray(obj.components)) {
    return "legacy-grouped";
  }
  return "corrupt";
}

function registriesDir(kbPath: string): string {
  return path.join(kbPath, "knowledge-base", "registries");
}

export function readKBSchemaVersion(kbPath: string): number | null {
  const file = path.join(registriesDir(kbPath), "components.json");
  if (!existsSync(file)) return null;
  const raw = readFileSync(file, "utf8");
  try {
    const parsed = JSON.parse(raw) as { version?: unknown };
    if (typeof parsed.version === "number") return parsed.version;
    return null;
  } catch {
    return null;
  }
}

export function assertKBCompatible(kbPath: string): void {
  const componentsFile = path.join(registriesDir(kbPath), "components.json");
  if (!existsSync(componentsFile)) {
    throw new KBSchemaError(
      `No KB found at ${kbPath}. Run \`setup bridge\` first.`,
      "missing"
    );
  }
  const raw = readFileSync(componentsFile, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new KBSchemaError(
      `KB registries/components.json is not valid JSON.`,
      "corrupt"
    );
  }
  const shape = probeComponentsShape(parsed);
  if (shape === "legacy-grouped") {
    throw new KBSchemaError(
      `KB at ${kbPath} uses a legacy grouped-by-category shape. Run \`bridge-ds migrate\` to convert it to schema v${CURRENT_KB_SCHEMA_VERSION}.`,
      "legacy"
    );
  }
  if (shape === "corrupt") {
    throw new KBSchemaError(
      `KB registries/components.json has an unrecognized shape.`,
      "corrupt"
    );
  }
  const version = (parsed as { version?: number }).version ?? 1;
  if (version > CURRENT_KB_SCHEMA_VERSION) {
    throw new KBSchemaError(
      `KB schema version ${version} is newer than this CLI supports (${CURRENT_KB_SCHEMA_VERSION}). Upgrade @noemuch/bridge-ds.`,
      "newer"
    );
  }
}
