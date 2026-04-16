import type {
  ComponentRegistry,
  VariableRegistry,
  TextStyleRegistry,
  Category,
} from "./registry-io.js";

export interface LearningsFile {
  learnings: Array<{
    id: string;
    scope: string[];
    frequency: number;
    agreedBy: number;
    promoted?: boolean;
    promotedAt?: string;
  }>;
  flags: unknown[];
}
export interface RecipesFile {
  recipes: Array<{ id: string; name: string; components?: string[] }>;
}

export interface KbInput {
  components: ComponentRegistry;
  variables: VariableRegistry;
  textStyles: TextStyleRegistry;
  learnings: LearningsFile;
  recipes: RecipesFile;
}

export interface KbIndex {
  version: string;
  generatedAt: string;
  tokenIndex: Record<
    string,
    {
      category: "color" | "spacing" | "radius" | "text" | "other";
      key: string;
      valuesByMode?: Record<string, unknown>;
      usedBy: string[];
    }
  >;
  componentIndex: Record<
    string,
    {
      category: Category;
      status: string;
      key: string;
      uses: { tokens: string[]; components: string[] };
      usedBy: string[];
      alternatives: string[];
      composesWith: string[];
      supersedes: string[];
      deprecatedBy: string | null;
    }
  >;
  learningIndex: Record<
    string,
    { scope: string[]; frequency: number; agreedBy: number; promoted: boolean; promotedAt?: string }
  >;
  patternIndex: Record<string, { components: string[]; recipes: string[] }>;
}

function categorize(name: string): "color" | "spacing" | "radius" | "text" | "other" {
  if (name.startsWith("color/")) return "color";
  if (name.startsWith("spacing/")) return "spacing";
  if (name.startsWith("radius/")) return "radius";
  if (name.startsWith("text/")) return "text";
  return "other";
}

export function buildFromScratch(kb: KbInput): KbIndex {
  const tokenIndex: KbIndex["tokenIndex"] = {};
  for (const v of kb.variables.variables) {
    const ref = "$" + v.name;
    tokenIndex[ref] = {
      category: categorize(v.name),
      key: v.key,
      valuesByMode: v.valuesByMode,
      usedBy: [],
    };
  }
  for (const s of kb.textStyles.styles) {
    const ref = "$text/" + s.name.replace(/^text\//, "");
    tokenIndex[ref] = { category: "text", key: s.key, usedBy: [] };
  }

  const componentIndex: KbIndex["componentIndex"] = {};
  for (const c of kb.components.components) {
    componentIndex[c.name] = {
      category: c.category,
      status: c.status,
      key: c.key,
      uses: { tokens: [], components: [] },
      usedBy: [],
      alternatives: [],
      composesWith: [],
      supersedes: [],
      deprecatedBy: null,
    };
  }

  const learningIndex: KbIndex["learningIndex"] = {};
  for (const l of kb.learnings.learnings) {
    learningIndex[l.id] = {
      scope: l.scope,
      frequency: l.frequency,
      agreedBy: l.agreedBy,
      promoted: Boolean(l.promoted),
      promotedAt: l.promotedAt,
    };
  }

  const patternIndex: KbIndex["patternIndex"] = {};
  for (const r of kb.recipes.recipes) {
    if (r.components && r.components.length > 0)
      patternIndex[r.name] = { components: r.components, recipes: [r.id] };
  }

  return {
    version: "3.2.0",
    generatedAt: new Date().toISOString(),
    tokenIndex,
    componentIndex,
    learningIndex,
    patternIndex,
  };
}

export interface Changeset {
  components: {
    added: string[];
    modified: string[];
    removed: string[];
    renamed: Array<{ from: string; to: string }>;
  };
  variables: {
    added: string[];
    modified: string[];
    removed: string[];
    renamed: Array<{ from: string; to: string }>;
  };
  textStyles: {
    added: string[];
    modified: string[];
    removed: string[];
    renamed: Array<{ from: string; to: string }>;
  };
  learnings: { added: string[]; modified: string[]; removed: string[] };
}

export function patch(existing: KbIndex, _changeset: Changeset, kb: KbInput): KbIndex {
  const next = buildFromScratch(kb);
  for (const name of Object.keys(next.componentIndex)) {
    const prev = existing.componentIndex[name];
    if (prev) {
      next.componentIndex[name].alternatives = prev.alternatives;
      next.componentIndex[name].composesWith = prev.composesWith;
      next.componentIndex[name].supersedes = prev.supersedes;
      next.componentIndex[name].deprecatedBy = prev.deprecatedBy;
    }
  }
  return next;
}
