# Action: spec {name}

> Write or validate a specification. Auto-detects component vs screen mode.

---

## Procedure

### 1. Determine mode

Ask or infer from context:
- **Component**: design system primitive, block, or composition (Button, Card, Tag...)
- **Screen**: full interface or page (dashboard, settings, onboarding flow...)

**If screen mode detected**, immediately ask the user:
```
This is a screen spec. For reliable generation, I need a reference:

→ Do you have a Figma URL of an existing screen with a similar layout?
  (e.g., same sidebar + content structure, same navigation shell)

With a reference, I'll clone the shell and replace the content (fast, accurate).
Without one, I'll build from scratch (slower, may need iterations).
```

### 2. Gather context

- **Load design patterns** (MANDATORY for screens, recommended for components):
  - `references/knowledge-base/guides/design-patterns.md` → pattern catalogue
  - Identify the **closest pattern** for this screen/component
  - **Read the referenced screenshots** (min 2) from `references/knowledge-base/ui-references/screenshots/`
  - Study: zones, proportions, density, hierarchy, navigation, card rhythm
  - The spec's **layout structure and architecture diagram** MUST be based on these patterns, not invented from scratch

- **Load DS knowledge base** — use these to make informed component and token choices:
  - `references/knowledge-base/guides/components/overview.md` → component decision tree
  - `references/knowledge-base/registries/components.json` → available components with Figma keys
  - `references/knowledge-base/guides/tokens/spacing-usage.md` → spacing scale + usage contexts
  - `references/knowledge-base/guides/tokens/color-usage.md` → color token decision tree
  - `references/knowledge-base/guides/tokens/typography-usage.md` → type hierarchy + font families
  - Load relevant pattern guides if screen mode (form-patterns.md, multi-step-flow.md, navigation-patterns.md, feedback-patterns.md)
  - Load relevant component group guides based on the screen's needs

- **Check knowledge base exists** — if `references/knowledge-base/registries/` is empty, tell the user: "Knowledge base not built yet. Run: `setup` first."

- Check existing specs: `specs/active/`, `specs/backlog/`
- Check existing DS components in `references/knowledge-base/registries/components.json`

### 3. Write the spec

Write to `specs/active/{name}-spec.md`.

> For multi-screen flows with their own splitting rules (e.g., `specs/active/f1/rules.md`), read those rules first for folder structure and naming conventions.

#### Component spec — mandatory sections:

- **Description** (what, why, design principle)
- **Architecture overview** (composition diagram)
- **Component hierarchy** (levels: primitive → blocks → composition)
- **Props API** (TypeScript interfaces, variant names matching Figma)
- **Layout specs** (dimensions, gaps, alignment)
- **Design tokens** (spacing, colors, typography, radius)
- **Component properties** (TEXT, INSTANCE_SWAP, BOOLEAN — Figma)
- **Reused DS components** (existing components from registry)
- **Acceptance criteria** (checkboxes, testable)
- **Open questions**

Use template from `references/templates/spec-template.md`.

#### Screen spec — mandatory sections:

- **Description** (what screen, user goal, context)
- **Visual reference** (pattern name, screenshots studied, key composition rules applied)
- **Layout structure** (zones, grid, responsive behavior — MUST follow matched pattern)
- **Sections breakdown** (header, content area, sidebar, footer...)
- **DS components used** (EXHAUSTIVE list — every visible element must be accounted for with Figma keys from registry)
- **Content structure** (real or realistic placeholder data)
- **States** (empty, loading, populated, error)
- **Design tokens** (background, spacing rhythm, elevation)
- **Responsive rules** (breakpoints, layout shifts)
- **Acceptance criteria** (checkboxes)
- **Open questions**

Use template from `references/templates/screen-template.md`.

#### Component spec — visual reference (recommended):

For components that appear in existing screens, also include:
- **Visual reference** (which pattern/screenshot shows a similar component, composition rules)
- This helps the `design` step match proportions and density

### 3b. Identify new DS components (screen mode only)

For each UI pattern described in the spec, check if it exists in `registries/components.json`:
- If a pattern is covered by an existing DS component → reference it in "DS Components Used"
- If a pattern is NOT covered → add it to the **"New DS Components Required"** section

**This is a blocking gate.** If new components are identified:
1. List them in the spec with: name, description, where they're used, and variants/states needed
2. After the screen spec is validated, each new component triggers its own `spec {component}` → `design` → `done` cycle
3. The screen `design` step is blocked until all new components exist in the DS

**Common signals that a new component is needed:**
- A card/tile with specific internal structure (icon + title + description + badge + CTA)
- A custom indicator or status pattern not covered by Badge/Tag
- A navigation pattern not covered by existing nav components
- A data display pattern not covered by existing list/table components

### 3c. Auto-enrich DS Components Used (screen mode)

For every component listed in "DS Components Used", resolve the exact registry key:

1. Search `registries/components.json` by name → fill the `Key` column with the exact key
2. Search `registries/icons.json`, `registries/logos.json` if applicable
3. For each element, determine the **strategy**:
   - Found in registry → `import`
   - Not in registry but exists in reference screen → `clone` (note the reference node ID)
   - Not in registry and no reference → flag as "New DS Component Required"

**Example enriched table:**
```
| Component | Variant | Key / Source | Strategy |
|-----------|---------|-------------|----------|
| Button | primary, large | components.json → key: abc123 | import |
| Logo | finary-one | logos.json → key: 78defbf4 | import |
| SideStepper | 5 steps | components.json → key: 1668b598 | clone (reference 9569:40240) |
| ProductBackground | finaryOne | NOT IN REGISTRY | clone (reference 9569:40233) |
```

This removes ambiguity at design time and prevents wrong component selection.

### 4. Validate

**Token architecture:**
- [ ] Every visual value references a design token (no hardcoded px/hex)
- [ ] Tokens use semantic names, not visual (`danger` not `red`)
- [ ] Aliasing depth ≤ 2 levels (primitive → semantic → component max)

**Naming conventions:**
- [ ] Variant names match Figma exactly
- [ ] Props use DS naming conventions (camelCase, `is` prefix for booleans, `on` prefix for events)
- [ ] Token references follow `{category}/{role}/{emphasis}` pattern

**Component API** (component mode only):
- [ ] Props surface area is minimal (composability over configuration)
- [ ] Composition pattern appropriate (slots > mega-props)
- [ ] Platform parity considered

**General:**
- [ ] Acceptance criteria are testable (not vague)
- [ ] Reused DS components identified
- [ ] Open questions are explicit

### 5. Present for review

Output the spec, flag assumptions, highlight open questions.

---

## Transition

When spec is approved → suggest: "Spec approved. Run: `design`"
