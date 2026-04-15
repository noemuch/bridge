import type { FigmaExtractResult } from "./figma-rest.js";

export type ExtractFn = (opts: { fileKey: string; token?: string }) => Promise<FigmaExtractResult>;

export async function extractFromMcp(_opts: { fileKey: string }): Promise<FigmaExtractResult> {
  throw new Error(
    "MCP extraction is interactive — run via the extracting-design-system skill. " +
      "For headless extraction, use extractFromFigma (REST)."
  );
}
