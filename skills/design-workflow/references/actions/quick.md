# Quick Mode — Express Design Generation

## Purpose
Generate a Figma design directly from a brief description, skipping the formal spec phase. Uses existing knowledge base, registries, and learnings. For when you need speed over ceremony.

## Prerequisites
- Knowledge base exists (registries populated) — if not, suggest: "Run `/design-workflow setup` first"
- MCP transport available (see transport-adapter.md)

## Procedure

### Step 1 — Load context
1. Load all registries (components.json, variables.json, text-styles.json)
2. Load all guides (token usage, component overview, design patterns)
3. Load learnings.json (apply all with scope=global + contextual matching description)
4. Load ui-references guide if available

### Step 2 — Gather intent (2 questions max)
Ask the user exactly two things:
1. **What to design**: brief description (e.g., "a settings page with profile section and notification preferences")
2. **Where**: Figma file URL or file key + page name

Do NOT ask for detailed content, states, responsive rules, or acceptance criteria. Infer reasonable defaults from the knowledge base and design patterns.

### Step 3 — Pattern matching (best-effort)
- Identify the screen type from the description
- Load matching design patterns from guides/design-patterns.md
- If ui-references/screenshots exist, identify the closest reference
- This step is NON-BLOCKING — if no pattern matches, proceed with reasonable layout defaults
- Note: in full mode, pattern matching is a blocking gate. In quick mode, it is best-effort.

### Step 4 — Generate mini-spec (inline, not persisted)
Write a condensed spec covering only:
- **Layout**: zones, grid, overall structure (1-2 sentences)
- **Sections**: list of sections with DS components to use (table format)
- **Tokens**: key tokens for the layout (background, spacing rhythm)
- **Known Preferences**: applicable learnings from learnings.json

Format as a concise markdown block. Do NOT write to specs/active/. This lives only in the conversation.

Show the mini-spec to the user and ask: "Generate this design?" (single yes/no confirmation)

### Step 5 — Generate design
Follow the same generation procedure as design.md steps 3-6:
1. Read figma-api-rules.md (MANDATORY — same rules apply in quick mode)
2. Determine canvas dimensions based on screen type
3. **Pre-script audit** (MANDATORY — list every element, cross-reference against registries. Validate all keys per Rule 26.)
4. Generate atomically in 4-6 scripts, ~30-80 lines each
5. Take screenshot after each atomic step for verification — **but NOT before Script 1** (Rule 24: empty pages/frames cannot be screenshotted)
6. For form inputs with values, use `state=filled` variant (Rule 25)
7. Fix any issues before proceeding to next step

IMPORTANT: These gates are NOT relaxed in quick mode:
- Pre-script element audit (Rule 18) — BLOCKING
- Registry key validation (Rule 26) — BLOCKING
- Zero hardcoded hex colors — BLOCKING
- Atomic generation with screenshots — MANDATORY
- DS component reuse (never recreate) — BLOCKING

### Step 6 — Present result
Take a final screenshot of the complete design. Present to the user with:
- Link to the Figma node
- Summary of what was created (sections, components used, tokens applied)
- Any learnings that were applied
- Suggestion: "Run `/design-workflow review` for a formal quality check, or `/design-workflow learn` if you make corrections"

## What is NOT done in quick mode
- No formal spec file written to specs/active/
- No formal review phase (but user can run review separately)
- No automatic snapshot for learn (but user can run learn separately)
- No pattern matching gate (best-effort only)
- No acceptance criteria validation

## Quality guarantee
Even in quick mode, every design:
- Uses 100% DS components (never raw recreations)
- Uses 100% bound tokens (never hardcoded hex)
- Is generated atomically with visual verification
- Follows all 22+ figma-api-rules
- Applies relevant learnings from previous corrections
