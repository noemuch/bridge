# Onboarding — Guided Workflow

> This file defines the guided flow that EVERY user follows. Each step blocks until its prerequisites are met. No shortcuts, no skipping — the output quality depends on it.

---

## Flow Overview

```
STEP 0  Setup check + Knowledge base
   ↓
STEP 1  Spec creation (component or screen)
   ↓
STEP 2  Spec validation (quality gates)
   ↓
STEP 3  New components check (screen mode only)
   ↓      ↓ (if new components found)
   ↓    STEP 3a  Spec component
   ↓    STEP 3b  Design component
   ↓    STEP 3c  Validate component → loop back to 3a if more
   ↓      ↓
STEP 4  Design (generate in Figma via figma_execute)
   ↓
STEP 5  Review (audit against spec + tokens)
   ↓      ↓ (if issues found)
   ↓    STEP 5a  Iterate → back to Review
   ↓      ↓
STEP 6  Done (archive + retro)
```

---

## STEP 0 — Setup Check + Knowledge Base

**Trigger**: any design-related request (spec, design, new component, new screen, setup, etc.)

### 0a. Check Figma MCP Transport

Detect which transport is available (see `references/transport-adapter.md` Section A):

1. **Check console transport:** Is `figma_execute` available? Try `figma_get_status()`.
2. **Check official transport:** Is `use_figma` available? Try `whoami()`.

| Result | Action |
|--------|--------|
| Console available | Use console transport. Verify: `figma_get_status()` returns `setup.valid: true` |
| Official only | Use official transport. Verify: `whoami()` succeeds, then test `use_figma` call |
| Both available | Use console (preferred — more capable, no response limits) |
| Neither available | **Block.** Show setup instructions for both options (see transport-adapter.md Section A) |

**Post-detection checks:**

| Check | Console | Official | Block message if fail |
|-------|---------|----------|-----------------------|
| Transport connected | `figma_get_status()` → `setup.valid: true` | `whoami()` succeeds + test `use_figma` call | Console: "Figma Desktop is not connected. Open: Plugins → Development → Desktop Bridge." / Official: "Figma MCP not authenticated. Check your Figma MCP configuration." |
| DS libraries enabled | Ask user to confirm | Ask user to confirm | "Make sure your DS libraries are enabled in the target Figma file (Assets panel → Team → Enable). Confirm when done." |

Report the active transport:
```
Transport: {console | official} ✓
```

**Note:** Setup check can be deferred to just before STEP 4 (design) if the user only wants to write a spec first. But it MUST pass before any Figma generation.

### 0b. Knowledge Base Check

Check if `references/knowledge-base/registries/` contains JSON files.

**If knowledge base exists:**
```
Setup OK. Knowledge base found ({N} components, {N} variables, {N} text styles).
What do you want to design? (component or screen)
```

**If knowledge base is empty → build it:**

#### Knowledge Base Directory Selection

Determine where to create the knowledge base:
- If `./.claude/skills/design-workflow/references/knowledge-base/` already exists (npm scaffold mode) → use that path
- Otherwise (plugin mode or fresh project) → create and use `./bridge-ds/knowledge-base/`

Create these subdirectories in the chosen KB root:
- `registries/`
- `guides/tokens/`
- `guides/components/`
- `guides/patterns/`
- `guides/assets/`
- `ui-references/screenshots/`

#### KB Generation Flow

1. **Ask the user for the DS library file key/URL** (the Figma file containing their design system)

2. **Extract raw data via MCP tools:**

   **Console transport:**
   ```
   figma_get_design_system_kit({ file_key: "...", format: "full" })
   figma_get_variables({ file_key: "..." })
   figma_get_styles({ file_key: "..." })
   ```

   **Official transport** (no `figma_get_design_system_kit`): Use the composite strategy from `references/transport-adapter.md` Section D:
   ```
   get_variable_defs({ fileKey: "..." })
   search_design_system({ query: "*", includeComponents: true })
   search_design_system({ query: "*", includeStyles: true })
   ```
   Supplement with `use_figma` extraction scripts from the schemas as needed.

3. **Write registries** (raw JSON, deterministic):

   **CRITICAL: Read the schema for each registry BEFORE writing it:**
   - `schemas/components.md` → `registries/components.json` (component names, **keys**, variants, properties)
   - `schemas/variables.md` → `registries/variables.json` (variable names, **keys**, types, values by mode)
   - `schemas/text-styles.md` → `registries/text-styles.json` (text style names, **keys**, font specs)
   - `schemas/assets.md` → `registries/icons.json`, `registries/logos.json`, `registries/illustrations.json` (if applicable)

   All paths relative to `knowledge-base/`. The schemas contain extraction scripts and required field definitions. The `key` field is MANDATORY for every component, variable, and style entry — without it, `design` generation will fail.

3b. **Validate registries (BLOCKING):**

   Read `schemas/validation.md` and execute the full validation procedure:
   1. **Structural check** — verify all registries match their schemas (every entry has `key`, correct types)
   2. **Import test** — run validation script via `figma_execute` to test-import 3-5 sample keys per registry
   3. **Remediation** — if ANY validation fails, re-extract the failing items using the remediation scripts
   4. **Gate** — ALL validation checks MUST pass before proceeding to guide generation

4. **Generate intelligent guides** (Claude analyzes registries and writes):

   **Token guides:**
   - `guides/tokens/color-usage.md` — Group colors by semantic role, create decision tree (when to use which token)
   - `guides/tokens/spacing-usage.md` — Map spacing values to UI contexts (form gaps, section gaps, card padding, etc.)
   - `guides/tokens/typography-usage.md` — Map text styles to hierarchy (display > heading > body > caption)

   **Component guides:**
   - `guides/components/overview.md` — Decision tree: "I need X" → use component Y. Cover every component.
   - `guides/components/{group}.md` — Per-group guides (actions, form-controls, data-display, feedback, navigation, layout) with: when to use, when NOT to use, props, variants, examples

   **Asset guides (if icons/logos/illustrations exist):**
   - `guides/assets/icons.md` — Categorized icon catalog
   - `guides/assets/logos.md` — Logo catalog
   - `guides/assets/illustrations.md` — Illustration catalog with usage contexts

5. **Ask the user for product screenshots:**
   ```
   To document your layout patterns, add screenshots of your product's key screens
   to: .claude/skills/design-workflow/references/knowledge-base/ui-references/screenshots/

   Ideal screenshots:
   - Dashboard / home page
   - List / category page
   - Detail / form page
   - Settings page
   - Modal / dialog
   - Empty state
   - Multi-step flow

   Drop the PNG/JPG files and confirm when done.
   ```

6. **Generate pattern guides** (Claude analyzes screenshots):
   - `guides/design-patterns.md` — Layout patterns catalogue with zone placement, proportions, density rules
   - `guides/patterns/form-patterns.md` — Form field patterns, validation, conditional fields
   - `guides/patterns/navigation-patterns.md` — Sidebar, tabs, breadcrumbs patterns
   - `guides/patterns/feedback-patterns.md` — Success, error, warning, loading states
   - `ui-references/ui-references-guide.md` — Which screenshot for which pattern type

7. **Validation summary:**
   ```
   Knowledge base built and validated:
   - {N} components documented ({N} with variants) — {N} keys verified via import test ✓
   - {N} variables ({N} colors, {N} spacing, {N} radius) — {N} keys verified ✓
   - {N} text styles — {N} keys verified ✓
   - {N} asset items (icons/logos/illustrations) — {N} keys verified ✓
   - {N} layout patterns extracted from {N} screenshots

   Ready to design. Run: `spec {name}`
   ```

---

## STEP 1 — Spec Creation

**Trigger**: user describes what they want to design

**Prerequisites:**
- No conflicting active spec in `specs/active/` (if one exists, ask: "There's already an active spec: `{name}`. Continue it, drop it, or move to backlog?")

**Guided questions (ask ONE BY ONE, not all at once):**

### 1.1 Mode detection
```
Is this a DS component (Button, Card, Modal...) or a screen/page (dashboard, onboarding...)?
```
If unclear from context, ask explicitly. Do NOT assume.

### 1.2 Core description
```
Describe in 2-3 sentences:
- What is it? (what)
- For whom / what user goal? (user goal)
- In what context does it appear? (context)
```

### 1.3 Content & structure
**Component mode:**
```
What are the elements of the component?
- What props/variants? (size, state, style...)
- What sub-elements? (icon, text, badge...)
- What states? (default, hover, disabled, loading...)
```

**Screen mode:**
```
What are the sections of the screen?
For each section:
- What does it display?
- What DS components does it use?
- What realistic content?
```

### 1.4 References
```
Do you have references? (existing Figma URL, screenshot, mockup, PM spec...)
```
If Figma URL provided → use `figma_take_screenshot` + `figma_get_component` to analyze.

### 1.5 Write the spec
Using the gathered info + DS knowledge base, write the spec to `specs/active/{name}-spec.md`.
Always use the appropriate template (`spec-template.md` or `screen-template.md`).

**On completion:**
```
Spec written: specs/active/{name}-spec.md
Let's validate it.
```

→ Auto-proceed to STEP 2.

---

## STEP 2 — Spec Validation

**Prerequisites:** spec file exists in `specs/active/`

**Run ALL quality gates from `quality-gates.md` (phases: spec → design).** Report as checklist.

**If ANY blocking gate fails:**
```
The spec isn't ready yet. Missing:
- {gate 1 that fails} → {concrete action to fix}
- {gate 2 that fails} → {concrete action to fix}

I'll fix it and we re-validate?
```
Fix the spec, then re-run validation. Loop until all gates pass.

**If ALL gates pass:**
```
Spec validated. All quality gates OK.
```

→ Screen mode: proceed to STEP 3
→ Component mode: proceed to STEP 4

---

## STEP 3 — New Components Check (screen mode only)

**Prerequisites:** validated screen spec

**Check the "New DS Components Required" section of the spec.**

### If "None":
```
No new components to create. All patterns covered by existing DS.
Let's proceed to design.
```
→ Proceed to STEP 4.

### If new components listed:
```
{N} new component(s) identified in the spec:
1. {ComponentName} — {short description}
2. {ComponentName} — {short description}

We need to create them before designing the screen.
Starting with: {ComponentName 1}
```

→ For EACH new component, run the sub-cycle:

### STEP 3a — Spec the component
Run STEP 1 in component mode, pre-filled with context from the screen spec.

### STEP 3b — Design the component
Run STEP 4 for the component (create in Figma with all variants).

### STEP 3c — Validate the component
Run STEP 5 (review) for the component.
On pass → `done` the component, then loop back to 3a for the next component.

**When ALL new components are done:**
```
All new components created and validated:
- {Component 1} → done
- {Component 2} → done

Now we can design the screen with real DS components.
```
→ Proceed to STEP 4 for the screen.

---

## STEP 4 — Design

**Prerequisites (ALL must pass):**
- [ ] Spec validated (STEP 2 passed)
- [ ] New components created if needed (STEP 3 passed)
- [ ] Figma MCP transport connected (STEP 0 check)
- [ ] DS libraries enabled

**If any prerequisite fails → block with specific message from Block Messages Reference.**

**Before generating:** confirm scope with the user:
```
I'll generate:
- Type: {component with N variants | screen with N sections}
- Canvas: {1440px (web) | 390px (mobile) | 1024px (tablet)}
- States: {list of states to generate}
- Approach: atomic ({N} steps with screenshot verification between each)

Ready? I'll start generating.
```

Wait for explicit user confirmation, then execute `actions/design.md`.

**Atomic generation (MANDATORY):** Never generate in a single monolithic script. Split into 4-6 small sequential steps (~30-80 lines each). After EACH step, verify visually with `figma_take_screenshot`. Fix issues before moving to the next step.

→ Proceed to STEP 5.

---

## STEP 5 — Review

**Prerequisites:** design generated in Figma

Execute `actions/review.md`. Present verdict:

- **PASS** → "Review OK. Design is spec-compliant. Archive it?"
- **NEEDS ITERATION** → fix issues via `figma_execute` scripts, re-review. Loop until PASS.

→ Proceed to STEP 6 on user confirmation.

---

## STEP 6 — Done

**Prerequisites:** review passed + user confirmation

**Execute `actions/done.md`:**
1. Move spec to `specs/shipped/`
2. Update `specs/history.log`
3. Brief retro (3 questions)

```
## Done: {name}

Spec archived: specs/shipped/{name}-spec.md
Figma: {url if available}

### Quick retro
- What went well: {positives}
- What was friction: {improvements}
- What was learned: {reusable learnings}

Ready for the next design!
```

---

## Block Messages Reference

| Situation | Message |
|-----------|---------|
| No MCP transport | "No Figma MCP transport detected. See `references/transport-adapter.md` Section A for setup instructions (console or official)." |
| Not connected | Console: "Figma Desktop is not connected. Open: Plugins → Development → Desktop Bridge." / Official: "Figma MCP not authenticated. Check your configuration." |
| Libraries not enabled | "Enable your DS libraries in the target Figma file: Assets → Team → Enable." |
| No knowledge base | "Knowledge base not built yet. Run: `setup`" |
| No active spec | "No active spec. Let's create one: component or screen?" |
| Conflicting active spec | "There's already an active spec: `{name}`. Continue, drop, or backlog?" |
| Spec gate failed | "The spec isn't ready. Missing: {list}. I'll fix it?" |
| New components not created | "Component `{name}` doesn't exist in the DS yet. Let's create it first." |
| Design not generated | "No Figma design yet. Start generating?" |
| Review failed | "The design has {N} issue(s). I'll fix and re-review?" |

---

## Skip Policy

Users CAN explicitly ask to skip a non-critical gate. When they do:
1. Warn: "Sure? Skipping this step may impact quality."
2. If confirmed: log the skip reason, proceed, flag it in the review as advisory
3. **NEVER skip**: spec creation, spec validation, new components check, pattern matching, visual fidelity review, DS component reuse audit, pre-script element audit, registry loading
