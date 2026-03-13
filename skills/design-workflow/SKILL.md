---
name: design-workflow
description: >
  Spec-first workflow for designers who use Claude Code to design in Figma.
  Covers components and full interfaces/screens. Use when a designer wants to:
  (1) write or review a component or screen spec, (2) generate a Figma design via MCP,
  (3) review and iterate on a design, (4) close or abandon work.
  Triggers: "spec", "design", "screen", "review", "done", "drop", "status",
  "setup", "workflow", "what's next", "new component", "new screen", or any design request.
---

# Design Workflow

> Spec-first workflow for designers using Claude Code to design in Figma.
> Powered by [figma-console-mcp](https://github.com/southleft/figma-console-mcp) as transport.
> **All output in the user's language.**

---

## Philosophy

1. **Spec-first** — No design without a validated specification
2. **Figma is the output** — Everything ends as native Figma layers
3. **DS-native** — Every visual element uses design system tokens and components, never hardcoded
4. **Composability over configuration** — Simple building blocks > mega-components
5. **Iterative** — Design → review → refine until right
6. **Atomic** — Small sequential scripts with visual verification between each step

---

## Commands

| Command | Purpose | Action file |
|---------|---------|-------------|
| `setup` | Extract DS + build knowledge base | `references/onboarding.md` (STEP 0) |
| `spec {name}` | Write a component or screen specification | `references/actions/spec.md` |
| `design` | Generate Figma design from active spec | `references/actions/design.md` |
| `review` | Validate design against spec, tokens, and visual fidelity | `references/actions/review.md` |
| `done` | Archive spec and close | `references/actions/done.md` |
| `drop` | Abandon with preserved learnings | `references/actions/drop.md` |
| `status` | Show current state and suggest next action | *(inline below)* |

---

## Two Modes

### Component mode
Design system components (Button, Card, Modal...):
```
spec {component}  →  design  →  review  →  done
```
Spec includes: architecture, props API, variants, tokens, Figma link.

### Screen mode
Full interfaces (dashboard, settings, onboarding...):
```
spec {screen}
  → if new DS components identified:
      spec {component}  →  design {component}  →  done {component}
  → design {screen}  →  review  →  done
```
Spec includes: layout, sections, components used, content structure, responsive rules.
**If the spec identifies UI patterns not covered by existing DS components**, they are flagged as new components. Each new component gets its own spec → design → done cycle before the screen design proceeds.

The `spec` action auto-detects the mode from context, or asks the user.

---

## Full Workflow

```
setup (first time only)
  → Extract DS via figma-console-mcp
  → Build knowledge base (registries + guides)
  ↓
spec {name}
  │
  ├─ [screen mode] → new components check
  │     └─ spec {component} → design → done → back to screen
  │
  ▼
design
  │
  ├─ STEP A: Pattern Matching ← BLOCKING
  │     1. Identify screen type
  │     2. Load design-patterns.md
  │     3. Read min 2 reference screenshots
  │     4. Extract: layout zones, proportions, density, hierarchy
  │     5. Gate: pattern matched and documented
  │
  ├─ STEP B: Atomic Generation via figma_execute
  │     1. Split into small sequential scripts (~30-80 lines each)
  │     2. After each step: verify with figma_take_screenshot
  │     3. Fix issues before proceeding to next step
  │     4. Generate states (clone + modify)
  │
  ▼
review
  │
  ├─ Structural review (spec compliance, tokens, completeness)
  │
  ├─ Visual fidelity review ← BLOCKING
  │     1. Compare with reference screenshots
  │     2. Check: layout, density, hierarchy, card patterns, navigation
  │     3. Verdict: PASS / FAIL with identified gaps
  │
  ▼
done
```

---

## Action Router

Detect intent from user input and **read the action file BEFORE executing**:

| User says | Route to |
|-----------|----------|
| "setup", "extract DS", "build knowledge base", "onboard" | `references/onboarding.md` (STEP 0) |
| "spec", "write spec", "new component", "new screen" | `references/actions/spec.md` |
| "design", "figma", "generate", "push to figma" | `references/actions/design.md` |
| "review", "check", "validate", "audit" | `references/actions/review.md` |
| "done", "finish", "complete", "close", "ship" | `references/actions/done.md` |
| "drop", "abandon", "cancel" | `references/actions/drop.md` |
| "status", "workflow", "what's next", "what now" | *(status logic below)* |

---

## Project Structure

```
specs/
  active/          ← Current work (0-1 specs)
  backlog/         ← Queued specs
  shipped/         ← Completed & archived
  dropped/         ← Abandoned with learnings
  history.log      ← One-line per design shipped
```

---

## Status Logic (inline)

Detect state by checking:
1. Does the knowledge base exist? (`references/knowledge-base/registries/` has JSON files)
2. Does `specs/active/` contain a spec?
3. Has a Figma design been generated for it?

| State | Suggestion |
|-------|------------|
| No knowledge base | "Run: `setup` to extract and document your DS" |
| No spec | "Ready. Run: `spec {name}`" |
| Active spec, no Figma design | "Spec ready. Run: `design`" |
| Active spec + Figma done | "Design ready. Run: `review`" |
| Review passed | "Run: `done`" |

---

## Quality Gates

Full definitions: `references/quality-gates.md` (read before any phase transition).

---

## Guided Mode (DEFAULT)

**Read `references/onboarding.md` BEFORE any action.** It defines the step-by-step flow with blocking gates.

**Non-negotiable rules:**
- NEVER skip spec creation, validation, or new components check
- NEVER skip pattern matching (no design without studying screenshots)
- ALWAYS read the action file BEFORE executing
- ALWAYS read `references/figma-api-rules.md` BEFORE writing any Figma script
- ALWAYS wait for user confirmation before generating in Figma

---

## References

| Reference | Path |
|-----------|------|
| Quality gates | `references/quality-gates.md` |
| Figma API rules | `references/figma-api-rules.md` |
| Onboarding flow | `references/onboarding.md` |
| Spec template (component) | `references/templates/spec-template.md` |
| Spec template (screen) | `references/templates/screen-template.md` |
| Design patterns | `references/knowledge-base/guides/design-patterns.md` |
| UI reference screenshots | `references/knowledge-base/ui-references/screenshots/` |

---

## MCP Tools Used

Bridge uses [figma-console-mcp](https://github.com/southleft/figma-console-mcp) for all Figma operations:

| Tool | Usage |
|------|-------|
| `figma_execute` | Run Figma Plugin API code (create frames, import components, bind variables) |
| `figma_take_screenshot` | Visual verification between atomic steps |
| `figma_get_design_system_kit` | Extract full DS (tokens + components + styles) during setup |
| `figma_get_variables` | Extract design tokens/variables |
| `figma_get_component` | Get component specs and properties |
| `figma_get_styles` | Get text, color, effect styles |
| `figma_search_components` | Find components by name |
| `figma_get_status` | Check Figma connection |
