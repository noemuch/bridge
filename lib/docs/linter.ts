// lib/docs/linter.ts
import YAML from "js-yaml";

export interface LintIssue {
  code: string;
  path: string;
  line?: number;
  field?: string;
  message: string;
}

export interface LintResult {
  path: string;
  issues: LintIssue[];
}

const REQUIRED_BY_KIND: Record<string, string[]> = {
  component: ["name", "category", "status", "last-regenerated"],
  foundation: ["name", "kind", "category", "last-regenerated"],
  pattern: ["name", "kind", "components", "last-regenerated"],
};

export function lintDoc(opts: {
  path: string;
  content: string;
  kind: "component" | "foundation" | "pattern";
  tokenIndex: Record<string, unknown>;
}): LintResult {
  const issues: LintIssue[] = [];
  const fmMatch = opts.content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    issues.push({
      code: "frontmatter.missing",
      path: opts.path,
      message: "Missing YAML frontmatter",
    });
    return { path: opts.path, issues };
  }
  let fm: Record<string, unknown> | null = null;
  try {
    const parsed = YAML.load(fmMatch[1]);
    fm =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
  } catch (e) {
    issues.push({ code: "frontmatter.invalid", path: opts.path, message: String(e) });
    return { path: opts.path, issues };
  }
  const required = REQUIRED_BY_KIND[opts.kind] ?? [];
  for (const r of required) {
    if (!(r in (fm ?? {}))) {
      issues.push({
        code: "frontmatter.required",
        path: opts.path,
        field: r,
        message: `Missing required field: ${r}`,
      });
    }
  }
  const body = opts.content.slice(fmMatch[0].length);
  const tokenRefRe =
    /\$color\/[a-zA-Z0-9/_-]+|\$spacing\/[a-zA-Z0-9/_-]+|\$text\/[a-zA-Z0-9/_-]+|\$radius\/[a-zA-Z0-9/_-]+/g;
  const refs = body.match(tokenRefRe) ?? [];
  for (const ref of refs) {
    if (!(ref in opts.tokenIndex)) {
      issues.push({
        code: "token.unresolved",
        path: opts.path,
        message: `Unresolved token reference: ${ref}`,
      });
    }
  }
  const deeplinks = body.match(/https:\/\/[^\s)]*figma\.com\/[^\s)]+/g) ?? [];
  for (const link of deeplinks) {
    if (!link.includes("node-id")) {
      issues.push({
        code: "figma.deeplink.shape",
        path: opts.path,
        message: `Figma link lacks node-id: ${link}`,
      });
    }
  }
  return { path: opts.path, issues };
}
