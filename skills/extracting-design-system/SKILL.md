---
name: extracting-design-system
description: Use when the user says "setup", "extract", "extract DS", "onboard", "build knowledge base", or is starting Bridge in a project for the first time. Extracts the user's design system from Figma (variables, components, text styles, icons, logos), validates registries, and builds the initial knowledge base with guides and a recipe index.
---

# Extracting Design System

## Overview

Bridge's onboarding skill. Connects to the user's Figma DS library via the active MCP transport, extracts variables / components / text styles / icons, validates that every entry has a reusable `key` (not a session-scoped `id`), writes per-domain registries under `knowledge-base/registries/`, generates human-readable guides under `knowledge-base/guides/`, and initializes an empty recipe index.

In V4.0.0 this skill will also support a **headless** mode invoked by `bridge-ds extract --headless` (cron) using the Figma REST API, but in V3.3.0 only the interactive MCP path is implemented.

## When to Use

Invoke when the user:
- says "setup", "extract", "extract DS", "onboard", "build KB", "refresh registries"
- has installed Bridge in a new project and has no `knowledge-base/`
- wants to re-extract after an upstream Figma change

Do NOT use if:
- a recent registry already exists and the user wants incremental sync — V4.0.0 `generating-ds-docs sync` handles this
- the user is designing — they need `generating-figma-design`

## Procedure

**Before starting, load:**
- `references/transport-adapter.md` (repo-root) — for transport detection and composite extraction strategy

### 1. Transport detection

Detect which transport is available (see `references/transport-adapter.md` (repo-root) Section A):

1. **Check console transport:** Is `figma_execute` available? Try `figma_get_status()`.
2. **Check official transport:** Is `use_figma` available? Try `whoami()`.

| Result | Action |
|--------|--------|
| Console available | Use console transport |
| Official only | Use official transport |
| Both available | Use console (preferred) |
| Neither available | **Block.** Show setup instructions from `references/transport-adapter.md` (repo-root) Section A |

Report:
```
Transport: {console | official}
```

### 2. Ask for DS library

```
What is the Figma URL of your design system library?
(The file containing your components, tokens, and styles)
```

Extract the `fileKey` from the URL.

### 3. Extract DS via MCP

**Console transport:**
```
figma_get_design_system_kit({ file_key: "{fileKey}", format: "full" })
figma_get_variables({ file_key: "{fileKey}" })
figma_get_styles({ file_key: "{fileKey}" })
```

**Official transport** (composite strategy — see `references/transport-adapter.md` (repo-root) Section D):
```
get_variable_defs({ fileKey: "{fileKey}" })
search_design_system({ query: "*", includeComponents: true })
search_design_system({ query: "*", includeStyles: true })
```
Supplement with `use_figma` extraction scripts as needed for detailed data.

### 4. Write registries

**Determine KB directory:**
- If `./.claude/skills/design-workflow/references/knowledge-base/` already exists -> use that path
- Otherwise -> create and use `./bridge-ds/knowledge-base/`

Create subdirectories:
```
knowledge-base/
  registries/
  guides/tokens/
  guides/components/
  guides/patterns/
  guides/assets/
  recipes/
  ui-references/screenshots/
```

**Read the schema for each registry BEFORE writing it:**
- `schemas/components.md` -> `registries/components.json`
- `schemas/variables.md` -> `registries/variables.json`
- `schemas/text-styles.md` -> `registries/text-styles.json`
- `schemas/assets.md` -> `registries/icons.json`, `registries/logos.json`, `registries/illustrations.json`

**CRITICAL:** Every entry MUST have a `key` field (hex hash for components, key string for variables). Without keys, the compiler cannot resolve `$token` references or import components.

### 5. Validate keys (BLOCKING)

Test-import 3-5 sample entries per registry via `figma_execute` (or `use_figma`):

**Components:** Try `importComponentByKeyAsync("{key}")` for 3-5 sample component keys.
**Variables:** Try `figma.variables.importVariableByKeyAsync("{key}")` for 3-5 sample variable keys.
**Text styles:** Try `figma.importStyleByKeyAsync("{key}")` for 3-5 sample text style keys.

If ANY validation fails:
1. Report which keys failed
2. Re-extract the failing items using remediation scripts from `schemas/validation.md`
3. Re-validate
4. **Gate:** ALL validation checks MUST pass before proceeding

Report:
```
Registry validation:
  Components: {n}/{n} keys verified
  Variables: {n}/{n} keys verified
  Text styles: {n}/{n} keys verified
  Assets: {n}/{n} keys verified (if applicable)
```

### 6. Generate guides

Claude analyzes the raw registry data and writes intelligent guides:

**Token guides:**
- `guides/tokens/color-usage.md` — Group colors by semantic role, create decision tree
- `guides/tokens/spacing-usage.md` — Map spacing values to UI contexts
- `guides/tokens/typography-usage.md` — Map text styles to hierarchy

**Component guides:**
- `guides/components/overview.md` — Decision tree: "I need X" -> use component Y
- `guides/components/{group}.md` — Per-group guides (actions, form-controls, data-display, feedback, navigation, layout)

**Asset guides (if icons/logos/illustrations exist):**
- `guides/assets/icons.md` — Categorized icon catalog
- `guides/assets/logos.md` — Logo catalog
- `guides/assets/illustrations.md` — Illustration catalog

### 7. Ask for product screenshots

```
To document your layout patterns, add screenshots of your product's key screens
to: {kb-path}/ui-references/screenshots/

Ideal screenshots:
- Dashboard / home page
- List / category page
- Detail / form page
- Settings page
- Modal / dialog
- Empty state
- Multi-step flow

Drop the PNG/JPG files and confirm when done.
(Skip this step if you don't have screenshots yet — you can add them later.)
```

### 8. Generate pattern guides (if screenshots provided)

Claude analyzes the screenshots and writes:
- `guides/design-patterns.md` — Layout patterns catalogue with zone placement, proportions, density
- `guides/patterns/form-patterns.md` — Form field patterns
- `guides/patterns/navigation-patterns.md` — Sidebar, tabs, breadcrumbs patterns
- `guides/patterns/feedback-patterns.md` — Success, error, warning, loading states
- `ui-references/ui-references-guide.md` — Which screenshot for which pattern type

### 9. Initialize recipe index

Create an empty recipe index:

```json
// recipes/_index.json
{
  "version": 1,
  "recipes": [],
  "lastUpdated": "{ISO date}"
}
```

### 10. Initialize learnings file

Create an empty learnings file (if it doesn't already exist):

```json
// learnings.json
{
  "meta": {
    "version": 1,
    "lastUpdated": "{ISO date}"
  },
  "learnings": [],
  "flags": []
}
```

---

## Output

```
Knowledge base built and validated:
  - {N} components documented ({N} with variants) — {N} keys verified
  - {N} variables ({N} colors, {N} spacing, {N} radius) — {N} keys verified
  - {N} text styles — {N} keys verified
  - {N} asset items (icons/logos/illustrations) — {N} keys verified
  - {N} layout patterns extracted from {N} screenshots
  - Recipe index initialized (empty)
  - Learnings file initialized (empty)

Ready to design. Run: `make <description>`
```

---

## Transition

When setup is complete -> suggest: "Run: `make <description>` to start designing" (handled by `generating-figma-design`)

<HARD-GATE>
NEVER write a registry entry without a `key` field (hex hash for
components/icons/logos; name path for variables). NodeId-only entries
are a gate failure.

NEVER mark setup complete without validating a sample of keys
(3–5 per registry) via a live import probe.
</HARD-GATE>

## Red Flags

See the full catalog at `references/red-flags-catalog.md` (repo-root).

Top flags for this skill:
- "I'll skip the key validation, the names look fine" → **Names are not keys. Validate by import.**
- "I'll use nodeIds — they're easier to copy from the API" → **NodeIds are session-scoped. Keys are persistent.**

## Verification

- **Gate A / B / C** — not applicable in V3.3.0 (setup does not compile,
  execute, or generate docs). Internal gates are key-validation and
  schema conformance, defined inline in the procedure.

Evidence to surface: per-registry entry counts, key-validation probe
results.
