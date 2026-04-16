// lib/kb/auto-detect.ts
import { readFile } from "node:fs/promises";
import path from "node:path";

const FIGMA_URL_RE = /https?:\/\/(?:www\.)?figma\.com\/(?:design|file)\/([a-zA-Z0-9_-]+)/;

/**
 * Detect a Figma file key by scanning, in order:
 * 1. README.md (provided path or "./README.md")
 * 2. CLAUDE.md (provided path or "./CLAUDE.md")
 * 3. package.json "figma.url" field
 * Returns the file key, or null if none found.
 */
export async function detectFigmaFileKey(
  opts: {
    readmePath?: string;
    claudeMdPath?: string;
    packageJsonPath?: string;
  } = {}
): Promise<string | null> {
  const candidates = [opts.readmePath ?? "README.md", opts.claudeMdPath ?? "CLAUDE.md"];
  for (const p of candidates) {
    try {
      const content = await readFile(p, "utf8");
      const match = content.match(FIGMA_URL_RE);
      if (match) return match[1];
    } catch {
      // file doesn't exist, continue
    }
  }
  // Fall back to package.json
  const pkgPath = opts.packageJsonPath ?? "package.json";
  try {
    const raw = await readFile(pkgPath, "utf8");
    const pkg = JSON.parse(raw) as { figma?: { url?: string } };
    if (pkg.figma?.url) {
      const match = pkg.figma.url.match(FIGMA_URL_RE);
      if (match) return match[1];
    }
  } catch {
    // file doesn't exist or invalid JSON, fall through
  }
  return null;
}

/**
 * Detect the GitHub remote repo in "owner/name" form from .git/config.
 * Accepts either an explicit content string (for testing) or a path.
 */
export async function detectGitRemote(
  opts: {
    gitConfigContent?: string;
    gitDir?: string;
  } = {}
): Promise<string | null> {
  let content = opts.gitConfigContent;
  if (content === undefined) {
    const gitDir = opts.gitDir ?? ".git";
    try {
      content = await readFile(path.join(gitDir, "config"), "utf8");
    } catch {
      return null;
    }
  }
  // Look for `url = ...github.com[:/]owner/repo(.git)?`
  const m = content.match(
    /url\s*=\s*(?:https?:\/\/|git@)github\.com[:/]([^\s\/]+)\/([^\s\/]+?)(?:\.git)?\s*$/m
  );
  if (m) return `${m[1]}/${m[2]}`;
  return null;
}
