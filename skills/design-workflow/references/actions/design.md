# Action: design

> Generate a Figma design from the active spec via figma-console-mcp.

---

## Prerequisites

- Active spec in `specs/active/` (abort if missing: "No active spec. Run: `spec {name}`")
- figma-console-mcp MCP server available (check with `figma_get_status`)
- **If screen spec lists "New DS Components Required"**: all listed components MUST be spec'd and designed first. Abort and prompt: "New component `{name}` needs to be created first. Run: `spec {name}`"

---

## Procedure

### 1. Read the active spec + DS knowledge base

Parse from spec:
- Mode (component or screen)
- All variants/sections/states
- Design tokens (colors, spacing, typography, radius)
- DS components used (with Figma component keys from registry)
- Content/data examples

**Load knowledge base registries (CRITICAL — must load before any script):**
- `registries/components.json` → component keys
- `registries/variables.json` → variable names and keys
- `registries/text-styles.json` → text style keys
- `registries/icons.json` → icon component keys (if exists)
- `registries/logos.json` → logo component keys (if exists)
- `registries/illustrations.json` → illustration component keys (if exists)

**Load token guides:**
- `guides/tokens/color-usage.md` → color token decision tree
- `guides/tokens/spacing-usage.md` → spacing scale + usage
- `guides/tokens/typography-usage.md` → font families, hierarchy

**Load relevant component/pattern guides** (based on spec content):
- `guides/components/overview.md` → component decision tree
- Specific group guides as needed (actions.md, form-controls.md, etc.)
- Pattern guides as needed (form-patterns.md, multi-step-flow.md, etc.)

**Load Figma API rules (CRITICAL — read before writing any script):**
- `references/figma-api-rules.md` → all API patterns, variable binding, boilerplate

All paths relative to `.claude/skills/design-workflow/references/knowledge-base/`.

**Registry key validation (BLOCKING):**
Before using any registry, verify that entries contain `key` fields (not just `id` or `name`):
- Components must have `key` (hex hash like `"abc123..."`) — NOT node IDs like `"1008:174"`
- Variables must have `key` — NOT just name paths like `"color/background/neutral/boldest"`
- If ANY registry is missing `key` fields → **STOP** and run `schemas/validation.md` procedure before continuing

### 1b. Pattern Matching (BLOCKING)

**This step is MANDATORY. No design generation without completing it.**

1. Load `guides/design-patterns.md`
2. Identify the screen type and find matching pattern(s)
3. Read at least 2 reference screenshots from `ui-references/screenshots/`
4. Extract pattern rules: layout zones, proportions, density, hierarchy, card patterns
5. Confirm pattern match before proceeding:
```
Pattern match: {pattern name}
Screenshots studied: {list}
Key rules applied: {bullet list}
```

**GATE: If no pattern matches**, ask the user which existing pattern is closest.

### 1c. Reference Inspection (BLOCKING for screens with reference)

**If the spec has a "Reference Screen" section with a Figma URL/node ID, this step is MANDATORY.**

1. **Screenshot the reference** via `figma_take_screenshot({ node_id, file_key })`
2. **Inspect the reference structure** via `figma_execute` — extract the node tree:
   ```js
   return (async function() {
     var ref = await figma.getNodeByIdAsync("REFERENCE_NODE_ID");
     if (!ref) return { error: "Node not found" };
     var children = [];
     for (var i = 0; i < ref.children.length; i++) {
       var c = ref.children[i];
       children.push({
         name: c.name, type: c.type, id: c.id,
         width: Math.round(c.width), height: Math.round(c.height),
         isComponent: c.type === "INSTANCE" || c.type === "COMPONENT",
         componentName: c.type === "INSTANCE" ? c.mainComponent.name : undefined
       });
     }
     return { name: ref.name, width: Math.round(ref.width), height: Math.round(ref.height), children: children };
   })();
   ```
3. **Document findings** before proceeding:
   ```
   Reference inspection:
   - Shell structure: {sidebar Xpx | content FILL | buffer Xpx}
   - DS components found: {list with node IDs}
   - Local/unpublished elements: {list with node IDs — these need cloning}
   - Logo variant: {exact name}
   - Key differences from spec: {what content changes}
   ```
4. **Update generation strategy:**
   - Elements found in reference → plan to **clone** (faster, guaranteed match)
   - Elements in DS registry but not in reference → plan to **import**
   - Update the pre-script audit to reflect clone vs import per element

**GATE:** Do not generate until reference inspection is complete and strategy is documented.

**If no reference provided (building from scratch):** Skip this step but warn the user:
```
No reference screen provided. Building layout from scratch.
This may require more iterations. For better results, provide a Figma URL
of an existing screen with a similar layout shell.
```

### 1d. Canvas dimensions

- **Web**: 1440px wide
- **Mobile**: 390px wide
- **Tablet**: 1024px wide

### 2. Ask target

Ask the user:
- **Which Figma file?** (URL or fileKey)
- **Which page?** (or create a new page)

Verify connection:
```
figma_get_status()
```

**Library activation check:** Verify DS libraries are **enabled** in the target file. `importComponentByKeyAsync` only works with published AND enabled libraries.

### 3. Generate the design — Atomic Steps

Write and execute Figma Plugin API scripts via `figma_execute`.

**Before writing any script, read `references/figma-api-rules.md`.** It contains:
- Mandatory patterns (FILL after appendChild, variable binding, font loading)
- DS component reuse rules (Rule 18) and canvas positioning (Rule 19)
- Standard script boilerplate with helpers

**Script execution via MCP:**
```
figma_execute({
  code: "return (async function() { ... your Plugin API code ... return { success: true }; })();"
})
```

The `return` before the IIFE is mandatory — without it, the Promise is lost.

**Atomic generation (MANDATORY approach):**

Never generate a full design in a single script. Split into small, sequential steps (~30-80 lines each). Each step:
1. Does ONE thing (structure, populate a section, override instances...)
2. Returns node IDs needed by subsequent steps
3. Is verified with a screenshot before moving on

**CRITICAL — Pre-script element audit (BLOCKING, Rule 18):**

Before writing EACH script, list every visual element it will create and cross-reference against the spec's "DS Components Used" table AND the registries:

```
PRE-SCRIPT AUDIT — Step {n}:
Spec requires:           Registry match:              Script will use:
─────────────────────────────────────────────────────────────────────
AssetLogo (logo)       → logos.json key: abc123       → importComponentByKeyAsync ✓
Tag v2 (label)         → components.json key: def456  → importComponentSetByKeyAsync ✓
CardBase (container)   → components.json key: ghi789  → importComponentByKeyAsync ✓
Section title          → NO DS component              → raw text (justified) ✓
Layout wrapper         → NO DS component              → raw frame (structural) ✓
```

**BLOCKING RULES:**
- If a spec-listed DS component is planned as a raw element → **STOP. Rewrite the script.**
- If an element exists in ANY registry (components, icons, logos, illustrations) → **MUST import it**. No exceptions.
- If you're about to use `figma.createEllipse()`, `figma.createRectangle()`, or `figma.createFrame()` for something that looks like a DS component → **STOP and check registries first.**
- Only create raw elements for pure structural layout frames or when NO DS component exists (document WHY in the audit).

NEVER recreate as raw frame/text/shape. NEVER hardcode hex colors — always bind variables.

**Standard steps for a screen:**

| Step | What | Lines | Returns |
|------|------|-------|---------|
| 1. Structure | Root frame + major section frames (empty) | ~40-60 | rootId, sectionIds |
| 2. Top bar / Nav | Populate nav with DS component instances | ~20-30 | — |
| 3. Content sections | One step per major section (header, cards, etc.) | ~40-60 | sectionId |
| 4. Footer / minor | Populate footer, labels, secondary elements | ~20-30 | — |
| 5. Instance overrides | Set TEXT/ICON props on all instances | ~30-50 | — |
| 6. States | Clone root + modify for additional states | ~30-50 | stateIds |

**Standard steps for a component:**

| Step | What | Lines | Returns |
|------|------|-------|---------|
| 1. Build variants | Create component frames with structure | ~60-80 | variantIds |
| 2. Combine + props | `combineAsVariants` + `addComponentProperty` | ~30-40 | compSetId |
| 3. Bind props | `componentPropertyReferences` on all nodes | ~30-40 | — |
| 4. Refinements | Adjust spacing, sizing, visual polish | ~20-30 | — |

**After each step:** verify visually with `figma_take_screenshot` before proceeding:
```
figma_take_screenshot({ node_id: "{rootOrSectionId}", file_key: "{fileKey}" })
```
Compare the screenshot against the spec and reference patterns. If something is wrong, fix it before moving to the next step.

### 3b. Component Properties (component mode)

When generating a **component**, expose all properties defined in the spec:
1. `addComponentProperty()` AFTER `combineAsVariants()` — see `figma-api-rules.md` Rule 9a
2. **Bind TEXT props** to text nodes via `componentPropertyReferences` — Rule 9b
3. **Bind INSTANCE_SWAP props** to icon/sub-component instances — Rule 9d
4. **Bind BOOLEAN props** to optional elements — Rule 9e

### 3c. Instance Overrides (screen mode)

When placing component instances in a **screen**, override properties to show specific content:
- Use `instance.setProperties({ [propKey]: value })` for TEXT overrides — Rule 9c
- Use `instance.setProperties({ [propKey]: componentId })` for INSTANCE_SWAP overrides
- Each instance should show unique, realistic content (not default placeholder text)

### 3d. Zero Raw Elements Rule

Before creating ANY visual element, check registries:
1. `components.json` — Buttons, Tags, Inputs, etc.
2. `icons.json` — All utility icons
3. `logos.json` — All brand logos
4. `illustrations.json` — Illustrations

Only create raw elements for pure layout frames or when no DS component exists (document why).

### 4. Multi-state generation

1. Create the base state first
2. Clone the root frame for each additional state
3. Modify each clone (swap variants, update text, change progress)
4. Add state labels above each frame

### 5. Final naming cleanup

Verify all layers have semantic names (no "Frame", "Rectangle", "Group").

---

## Output

```
Design created in Figma.

File: {figma_url}
Created:
  - {n} frames with auto-layout
  - {n} variables bound (colors + spacing + radius)
  - {n} DS component instances
  - States: {list}

Warnings:
  - {any issues}

Next: review the design in Figma, then run: `review`
```

---

## Transition

When design is in Figma → suggest: "Run: `review`"
