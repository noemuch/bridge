// ---------------------------------------------------------------------------
// plan.ts — Chunking planner, splits a resolved graph into executable chunks
// ---------------------------------------------------------------------------

import type { ResolvedNode, ResolvedSceneGraph, ImportEntry, ImportBundle } from "./types.js";

export const MAX_CHUNK_SIZE = 12000; // chars of generated code (before wrapping)
export const MAX_IMPORTS = 30; // variable/component/style imports per chunk
export const BUILD_TARGET = 3000; // target chars per build chunk
const CHARS_PER_NODE = 500; // rough estimate: 10 lines × 50 chars

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export interface Chunk {
  index: number;
  label: string;
  imports: ImportBundle;
  nodes: ResolvedNode[];
  bridgeExports: string[];
  bridgeImports: string[];
}

export interface ExecutionPlan {
  chunks: Chunk[];
  totalImports: number;
  estimatedCodeSize: number;
}

export interface PlanOptions {
  transport?: string;
  maxChunkSize?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countImports(imports: ImportBundle): number {
  const v = imports.variables?.length ?? 0;
  const c = imports.components?.length ?? 0;
  const s = imports.textStyles?.length ?? 0;
  return v + c + s;
}

/**
 * Rough code-size estimate for a set of nodes (recursive count).
 * NOTE: preserves the exact arithmetic of the pre-migration JS implementation.
 */
function estimateNodeSize(nodes: readonly ResolvedNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count += 1;
    const children = (node as { children?: ResolvedNode[] }).children;
    if (children && children.length) {
      count += estimateNodeSize(children);
    }
  }
  return count * CHARS_PER_NODE;
}

// ---------------------------------------------------------------------------
// Single-chunk plan
// ---------------------------------------------------------------------------

function singleChunkPlan(
  nodes: readonly ResolvedNode[],
  imports: ImportBundle,
  estimatedSize: number,
): ExecutionPlan {
  const total = countImports(imports);
  const chunk: Chunk = {
    index: 0,
    label: "build-0",
    imports: {
      variables: (imports.variables ?? []).slice(),
      components: (imports.components ?? []).slice(),
      textStyles: (imports.textStyles ?? []).slice(),
    },
    nodes: nodes.slice(),
    bridgeExports: [],
    bridgeImports: [],
  };
  return { chunks: [chunk], totalImports: total, estimatedCodeSize: estimatedSize };
}

// ---------------------------------------------------------------------------
// Multi-chunk plan
// ---------------------------------------------------------------------------

function multiChunkPlan(
  nodes: readonly ResolvedNode[],
  imports: ImportBundle,
  estimatedSize: number,
  _options: PlanOptions,
): ExecutionPlan {
  const total = countImports(imports);

  // Names exported from preload (all imports + "root")
  const exportNames: string[] = [];
  const vars: ImportEntry[] = imports.variables ?? [];
  const comps: ImportEntry[] = imports.components ?? [];
  const styles: ImportEntry[] = imports.textStyles ?? [];

  for (const v of vars) {
    exportNames.push(v.localName ?? v.name);
  }
  for (const c of comps) {
    exportNames.push(c.localName ?? c.name);
  }
  for (const s of styles) {
    exportNames.push(s.localName ?? s.name);
  }
  exportNames.push("root");

  // Chunk 0: preload
  const preload: Chunk = {
    index: 0,
    label: "preload",
    imports: {
      variables: vars.slice(),
      components: comps.slice(),
      textStyles: styles.slice(),
    },
    nodes: [],
    bridgeExports: exportNames.slice(),
    bridgeImports: [],
  };

  // Build chunks: group top-level children by estimated size
  const buildChunks: ResolvedNode[][] = [];
  let currentNodes: ResolvedNode[] = [];
  let currentSize = 0;

  for (const node of nodes) {
    const nodeSize = estimateNodeSize([node]);
    if (currentNodes.length > 0 && currentSize + nodeSize > BUILD_TARGET) {
      buildChunks.push(currentNodes);
      currentNodes = [];
      currentSize = 0;
    }
    currentNodes.push(node);
    currentSize += nodeSize;
  }
  if (currentNodes.length > 0) {
    buildChunks.push(currentNodes);
  }

  if (buildChunks.length === 0) {
    buildChunks.push([]);
  }

  const chunks: Chunk[] = [preload];
  for (let i = 0; i < buildChunks.length; i++) {
    chunks.push({
      index: i + 1,
      label: "build-" + i,
      imports: { variables: [], components: [], textStyles: [] },
      nodes: buildChunks[i]!,
      bridgeExports: [],
      bridgeImports: exportNames.slice(),
    });
  }

  return { chunks, totalImports: total, estimatedCodeSize: estimatedSize };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Plan how to split a resolved graph into executable chunks.
 */
export function plan(
  resolvedGraph: Pick<ResolvedSceneGraph, "nodes"> | null | undefined,
  imports: ImportBundle | null | undefined,
  options?: PlanOptions,
): ExecutionPlan {
  const opts = options ?? {};
  const maxChunk = opts.maxChunkSize ?? MAX_CHUNK_SIZE;
  const nodes: ResolvedNode[] = resolvedGraph?.nodes ?? [];
  const safeImports: ImportBundle = imports ?? { variables: [], components: [], textStyles: [] };

  const estimatedSize = estimateNodeSize(nodes);
  const totalImports = countImports(safeImports);

  if (estimatedSize < maxChunk && totalImports < MAX_IMPORTS) {
    return singleChunkPlan(nodes, safeImports, estimatedSize);
  }

  return multiChunkPlan(nodes, safeImports, estimatedSize, opts);
}
