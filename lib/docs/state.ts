// lib/docs/state.ts
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export interface DocsState {
  version: number;
  registriesHash: string;
  learningsHash: string;
  lastSyncAt?: string;
  lastCronRun?: string;
  perFileHashes: Record<string, string>;
}

const EMPTY: DocsState = { version: 1, registriesHash: "", learningsHash: "", perFileHashes: {} };

export async function readState(basePath: string): Promise<DocsState> {
  const p = path.join(basePath, ".bridge", "docs-state.json");
  try {
    const raw = await readFile(p, "utf8");
    return JSON.parse(raw) as DocsState;
  } catch {
    return { ...EMPTY };
  }
}

export async function writeState(basePath: string, state: DocsState): Promise<void> {
  await mkdir(path.join(basePath, ".bridge"), { recursive: true });
  await writeFile(
    path.join(basePath, ".bridge", "docs-state.json"),
    JSON.stringify(state, null, 2) + "\n",
    "utf8"
  );
}
