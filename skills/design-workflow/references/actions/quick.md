# Quick Mode — Express Design Generation

## Purpose
Generate a Figma design directly from a brief description, skipping the formal spec phase. Uses existing knowledge base, registries, and learnings. For when you need speed over ceremony.

## Prerequisites
- Knowledge base exists (registries populated) — if not, suggest: "Run `/design-workflow setup` first"
- MCP transport available (see transport-adapter.md)

## Brief Detection

If the prompt contains `AUTOMATED GENERATION` or follows the pattern:
```
/design-workflow quick

What: {description}
Where: {figma target}
```
→ **Brief provided mode.** Skip Step 2 (gather intent) and Step 4 confirmation. The "What" line IS the brief. The "Where" line IS the target. Proceed directly.

Otherwise → **Interactive mode.** Follow all steps including questions.

## Procedure

### Step 1 — Load context
1. Load all registries (components.json, variables.json, text-styles.json, icons.json, logos.json, illustrations.json)
2. Load all guides (token usage, component overview, design patterns)
3. Load learnings.json (apply all with scope=global + contextual matching description)
4. Load figma-api-rules.md (MANDATORY — read before writing any script)

### Step 2 — Gather intent (SKIP if brief provided)
Ask the user exactly two things:
1. **What to design**: brief description (e.g., "a settings page with profile section and notification preferences")
2. **Where**: Figma file URL or file key + page name

Do NOT ask for detailed content, states, responsive rules, or acceptance criteria. Infer reasonable defaults from the knowledge base and design patterns.

### Step 3 — Pattern matching (best-effort)
- Identify the screen type from the description
- Load matching design patterns from guides/design-patterns.md
- If ui-references/screenshots exist, identify the closest reference
- This step is NON-BLOCKING — if no pattern matches, proceed with reasonable layout defaults

### Step 4 — Generate mini-spec (inline, not persisted)
Write a condensed spec covering only:
- **Layout**: zones, grid, overall structure (1-2 sentences)
- **Sections**: list of sections with DS components to use (table format)
- **Tokens**: key tokens for the layout (background, spacing rhythm)
- **Known Preferences**: applicable learnings from learnings.json

Format as a concise markdown block. Do NOT write to specs/active/. This lives only in the conversation.

- **If brief provided**: generate the mini-spec silently and proceed directly to Step 5. Do NOT ask for confirmation.
- **If interactive**: show the mini-spec and ask "Generate this design?" (single yes/no confirmation)

### Step 5 — Consolidated element audit (ONE upfront pass)

**This replaces per-script audits. Do this ONCE before writing any generation code.**

List EVERY visual element that will appear in the entire design. Cross-reference each against ALL registries:

```
CONSOLIDATED ELEMENT AUDIT:
Element:                  Registry match:              Strategy:
─────────────────────────────────────────────────────────────────
Button (primary)        → components.json key: abc123  → importComponentSetByKeyAsync ✓
TextInput (default)     → components.json key: def456  → importComponentSetByKeyAsync ✓
Icon (chevron-right)    → icons.json key: ghi789       → importComponentByKeyAsync ✓
Logo (full-finary)      → logos.json key: jkl012       → importComponentByKeyAsync ✓
Section title           → NO DS component              → raw text (structural) ✓
Layout wrapper          → NO DS component              → raw frame (structural) ✓

VARIABLES:
Token:                    Registry key:
─────────────────────────────────────────
color/background/default → variables.json key: aaa111
spacing/medium           → variables.json key: bbb222
radius/medium            → variables.json key: ccc333

TEXT STYLES:
Style:                    Registry key:
─────────────────────────────────────────
heading/md               → text-styles.json key: ddd444
body/md                  → text-styles.json key: eee555
```

**BLOCKING RULES (Rule 18 + Rule 26):**
- If ANY spec-listed DS component is planned as a raw element → **STOP and fix the audit.**
- If ANY element exists in a registry → **MUST import it.** No exceptions.
- Validate ALL registry keys are hex hashes (40+ chars), NOT node IDs.
- Every color MUST use a variable from the audit. Zero hardcoded hex.

### Step 6 — Generate design (1-2 consolidated scripts)

**Key principle: generate the ENTIRE design in as few scripts as possible.**

1. **Determine canvas dimensions** based on screen type:
   - Web: 1440px wide / Mobile: 390px wide / Tablet: 1024px wide

2. **Write Script 1** (~100-200 lines) — creates the complete design:
   - All font loads at the top
   - All variable/component/style imports at the top (from the audit)
   - All helpers defined once (mf, appendFill, bindPadding, bindRadius)
   - Full layout tree built in sequence (structure → content → instances → overrides)
   - Return root node ID
   - Follow script structure from figma-api-rules.md Rule 17

3. **Execute Script 1** via MCP (console: `figma_execute`, official: `use_figma`)

4. **Take screenshot** of the root node to verify

5. **If screenshot reveals issues**: write Script 2 to fix them. Execute + screenshot again.
   **If screenshot looks correct**: proceed to Step 7.

**30-second timeout constraint:**
The `figma_execute` tool has a 30s timeout. If the design is complex (4+ major sections, 10+ component instances), consider splitting:
- Script 1: Structure + first half of sections (~100-120 lines)
- Script 2: Remaining sections + overrides (~80-100 lines)
Take a screenshot after each script.

**Maximum: 2 generation scripts + 1 fix script = 3 scripts total, 3 screenshots total.**

**Rules that ALWAYS apply (from figma-api-rules.md):**
- Rule 1: FILL after appendChild (never before)
- Rule 3: Colors via setBoundVariableForPaint (never setBoundVariable for fills)
- Rule 4: textAutoResize after width is set
- Rule 17: Script structure (IIFE wrapper with return)
- Rule 18: DS component reuse (validated in Step 5 audit)
- Rule 19: Canvas positioning (80px+ gaps)
- Rule 22: Clone-first if reference available
- Rule 25: Form inputs with values → use state=filled variant
- Rule 26: Registry key validation (validated in Step 5 audit)

### Step 7 — Present result
Take a final screenshot of the complete design. Present to the user with:
- Link to the Figma node
- Summary of what was created (sections, components used, tokens applied)
- Any learnings that were applied
- Suggestion: "Run `/design-workflow review` for a formal quality check, or `/design-workflow learn` if you make corrections"

If this is an automated generation (brief provided), output the result line:
```
RESULT_JSON: {"success": true, "summary": "description of what was created", "nodeId": "root node ID"}
```

## What is NOT done in quick mode
- No formal spec file written to specs/active/
- No per-script audits (replaced by single upfront audit in Step 5)
- No formal review phase (but user can run review separately)
- No automatic snapshot for learn (but user can run learn separately)
- No pattern matching gate (best-effort only)
- No acceptance criteria validation

## Quality guarantee
Even in quick mode, every design:
- Uses 100% DS components (never raw recreations) — validated by upfront audit
- Uses 100% bound tokens (never hardcoded hex) — validated by upfront audit
- Is verified with screenshots after generation
- Follows all figma-api-rules
- Applies relevant learnings from previous corrections

## Turn Budget

Target: **4-6 Claude turns total** (not 15-20+)

| Turn | Action |
|------|--------|
| 1 | Load context (registries, guides, learnings, figma-api-rules) |
| 2 | Pattern matching + mini-spec (combined if brief provided) |
| 3 | Consolidated audit + write Script 1 |
| 4 | Execute Script 1 + screenshot |
| 5 | Script 2 if needed (fix or split) + screenshot |
| 6 | Present result |

If the generation completes in Script 1 with no issues, turns 5 is skipped.
**Do NOT use extra turns for polishing, refactoring, or re-auditing.**
