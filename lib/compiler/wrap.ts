// ---------------------------------------------------------------------------
// Transport wrappers — produce executable script strings from generated code
// ---------------------------------------------------------------------------

import { HELPER_BLOCK } from "./helpers.js";
import { CompilerError } from "./errors.js";

export type Transport = "console" | "official";

const MAX_OFFICIAL_SIZE = 20000;
const NOTIFY_RE = /figma\.notify\([^)]*\);?\n?/g;

// ---------------------------------------------------------------------------
// Console transport (figma_execute) — IIFE wrapper
// ---------------------------------------------------------------------------

/**
 * Wrap code for the console transport (figma_execute).
 */
export function wrapConsole(code: string, fontCode: string): string {
  const parts: string[] = ["return (async function() {"];
  if (fontCode) {
    parts.push(fontCode);
  }
  parts.push(HELPER_BLOCK);
  parts.push(code);
  parts.push("return { success: true, rootId: root.id };");
  parts.push("})();");
  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Official transport (use_figma) — top-level await, no IIFE
// ---------------------------------------------------------------------------

/**
 * Wrap code for the official transport (use_figma).
 * Strips figma.notify() calls and enforces the 20KB limit.
 */
export function wrapOfficial(
  code: string,
  fontCode: string,
  fileKey: string | null | undefined,
  _description?: string
): string {
  if (!fileKey) {
    throw new CompilerError("WRAP_MISSING_FILEKEY");
  }

  const sanitized = code.replace(NOTIFY_RE, "");

  const parts: string[] = [];
  if (fontCode) {
    parts.push(fontCode);
  }
  parts.push(HELPER_BLOCK);
  parts.push(sanitized);
  parts.push("return { success: true, rootId: root.id };");

  const result = parts.join("\n");

  if (result.length > MAX_OFFICIAL_SIZE) {
    throw new CompilerError("WRAP_CODE_TOO_LARGE", {
      message: "Generated code is " + result.length + " chars (limit: " + MAX_OFFICIAL_SIZE + ")",
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Chunk wrapper — dispatches to console or official based on transport
// ---------------------------------------------------------------------------

export interface WrapChunkDescriptor {
  label: string;
  // Additional fields exist on the chunk but are unused by wrapChunk.
}

/**
 * Wrap a single chunk for execution.
 * For multi-chunk build chunks (non-preload), prepends globalThis destructuring.
 */
export function wrapChunk(
  code: string,
  chunk: WrapChunkDescriptor,
  transport: Transport,
  fileKey?: string | null
): string {
  // codegen already handles globalThis bridging in build chunks — no extra destructuring needed here

  if (transport === "official") {
    return wrapOfficial(code, "", fileKey ?? null, chunk.label);
  }

  return wrapConsole(code, "");
}
