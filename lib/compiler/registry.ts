// ---------------------------------------------------------------------------
// registry.ts — load knowledge-base registries from disk
// ---------------------------------------------------------------------------

import * as fs from "node:fs";
import * as path from "node:path";
import { assertKBCompatible } from "../kb/schema-version.js";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export interface VariableEntry {
  name: string;
  key: string;
  collection: string;
}

export interface ComponentEntry {
  name: string;
  key: string;
  type: string;
  properties: Record<string, unknown>;
}

export interface TextStyleEntry {
  name: string;
  key: string;
}

export interface AssetEntry {
  name: string;
  key: string;
  type?: string;
}

export interface VariableIndex {
  byName: Map<string, VariableEntry>;
  bySegment: Map<string, VariableEntry[]>;
}

export interface ComponentIndex {
  byName: Map<string, ComponentEntry>;
}

export interface TextStyleIndex {
  byName: Map<string, TextStyleEntry>;
  bySegment: Map<string, TextStyleEntry[]>;
}

export interface AssetIndex {
  byName: Map<string, AssetEntry>;
}

export interface Registry {
  variables: VariableIndex;
  components: ComponentIndex;
  textStyles: TextStyleIndex;
  icons: AssetIndex;
  logos: AssetIndex;
  allVariableNames: string[];
  allComponentNames: string[];
  allStyleNames: string[];
}

// ---------------------------------------------------------------------------
// Raw on-disk shapes (subset we actually consume)
// ---------------------------------------------------------------------------

interface RawVariableItem {
  name: string;
  key: string;
  resolvedType?: string;
  valuesByMode?: Record<string, unknown>;
  scopes?: string[];
}
interface RawVariablesFile {
  version?: number;
  variables?: RawVariableItem[];
}

interface RawComponentItem {
  name: string;
  key: string;
  type?: string;
  category?: string;
  status?: string;
  variants?: Array<{ name: string; values: string[] }>;
  properties?: Array<{ name: string; type: string; default?: unknown }> | Record<string, unknown>;
  description?: string;
}
interface RawComponentsFile {
  version?: number;
  components?: RawComponentItem[];
}

interface RawTextStyleItem {
  name: string;
  key: string;
  fontFamily?: string;
  fontStyle?: string;
  fontSize?: number;
}
interface RawTextStylesFile {
  version?: number;
  styles?: RawTextStyleItem[];
}

interface RawAssetItem {
  name: string;
  key: string;
  type?: string;
}
interface RawAssetsFile {
  items?: RawAssetItem[];
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Safely read and parse a JSON file. Returns null if the file is missing.
 */
function readJSON<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

/**
 * Generate segment keys from a slash-separated name.
 * For "color/background/neutral/boldest" produces:
 *   ["color", "color/background", "color/background/neutral"]
 * (every prefix except the full name itself)
 */
function segmentKeys(name: string): string[] {
  const parts = name.split("/");
  const keys: string[] = [];
  for (let i = 1; i < parts.length; i++) {
    keys.push(parts.slice(0, i).join("/"));
  }
  return keys;
}

// ---------------------------------------------------------------------------
// INDEX BUILDERS
// ---------------------------------------------------------------------------

function buildVariableIndex(data: RawVariablesFile | null): VariableIndex {
  const byName = new Map<string, VariableEntry>();
  const bySegment = new Map<string, VariableEntry[]>();

  if (!data || !data.variables) return { byName, bySegment };

  for (const v of data.variables) {
    const entry: VariableEntry = { name: v.name, key: v.key, collection: "" };
    byName.set(v.name, entry);

    for (const seg of segmentKeys(v.name)) {
      let bucket = bySegment.get(seg);
      if (!bucket) {
        bucket = [];
        bySegment.set(seg, bucket);
      }
      bucket.push(entry);
    }
  }

  return { byName, bySegment };
}

function buildComponentIndex(data: RawComponentsFile | null): ComponentIndex {
  const byName = new Map<string, ComponentEntry>();

  if (!data || !data.components) return { byName };

  for (const comp of data.components) {
    const entry: ComponentEntry = {
      name: comp.name,
      key: comp.key,
      type: comp.type ?? "COMPONENT",
      properties: Array.isArray(comp.properties)
        ? {}
        : ((comp.properties as Record<string, unknown>) ?? {}),
    };
    byName.set(comp.name.toLowerCase(), entry);
  }

  return { byName };
}

function buildTextStyleIndex(data: RawTextStylesFile | null): TextStyleIndex {
  const byName = new Map<string, TextStyleEntry>();
  const bySegment = new Map<string, TextStyleEntry[]>();

  if (!data || !data.styles) return { byName, bySegment };

  for (const s of data.styles) {
    const entry: TextStyleEntry = { name: s.name, key: s.key };
    byName.set(s.name, entry);

    for (const seg of segmentKeys(s.name)) {
      let bucket = bySegment.get(seg);
      if (!bucket) {
        bucket = [];
        bySegment.set(seg, bucket);
      }
      bucket.push(entry);
    }
  }

  return { byName, bySegment };
}

function buildAssetIndex(data: RawAssetsFile | null): AssetIndex {
  const byName = new Map<string, AssetEntry>();

  if (!data || !data.items) return { byName };

  for (const item of data.items) {
    const entry: AssetEntry = { name: item.name, key: item.key, type: item.type };
    byName.set(item.name, entry);
  }

  return { byName };
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

/**
 * Load all KB registry files and return a fully-indexed Registry object.
 */
export function loadRegistry(kbPath: string): Registry {
  assertKBCompatible(kbPath);
  const regPath = path.join(kbPath, "knowledge-base", "registries");

  const variablesData = readJSON<RawVariablesFile>(path.join(regPath, "variables.json"));
  const componentsData = readJSON<RawComponentsFile>(path.join(regPath, "components.json"));
  const textStylesData = readJSON<RawTextStylesFile>(path.join(regPath, "text-styles.json"));
  const iconsData = readJSON<RawAssetsFile>(path.join(regPath, "icons.json"));
  const logosData = readJSON<RawAssetsFile>(path.join(regPath, "logos.json"));

  const variables = buildVariableIndex(variablesData);
  const components = buildComponentIndex(componentsData);
  const textStyles = buildTextStyleIndex(textStylesData);
  const icons = buildAssetIndex(iconsData);
  const logos = buildAssetIndex(logosData);

  // Pre-compute name arrays for fuzzy matching
  const allVariableNames = Array.from(variables.byName.keys());
  const allComponentNames = Array.from(components.byName.keys());
  const allStyleNames = Array.from(textStyles.byName.keys());

  return {
    variables,
    components,
    textStyles,
    icons,
    logos,
    allVariableNames,
    allComponentNames,
    allStyleNames,
  };
}
