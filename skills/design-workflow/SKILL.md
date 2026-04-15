---
name: design-system
version: 3.1.0
description: Use when designer invokes make/fix/done/setup/drop/docs, or requests to design/create/build/generate/fix a Figma component or screen, or asks about Bridge workflow, tokens, components, recipes, or the design system.
triggers:
  - make
  - design
  - create
  - build
  - generate
  - fix
  - correct
  - learn
  - done
  - ship
  - setup
  - extract
  - status
  - drop
  - component
  - screen
  - token
  - spacing
  - color
  - typography
requires:
  actions:
    - figma
bridge:
  min_version: "0.1.0"
  has_compiler: true
  compiler_path: "../../lib/compiler/compile.js"
priority_references:
  - compiler-reference.md
  - transport-adapter.md
generation_phases:
  - Analyzing
  - Planning
  - Speccing
  - Compiling
  - Executing
  - Verifying
  - Finalizing
readiness:
  - id: figma-connected
    check: mcp_tool
    tool: figma_get_status
    description: "Figma Console plugin connected"
    resolution_hint: "Install figma-console-mcp plugin in Figma Desktop"
  - id: knowledge-base
    check: kb_populated
    description: "Design tokens and components extracted"
    resolution_hint: "Run bridge setup to extract your design system"
setup:
  - type: tool_check
    id: check_figma
    tool: figma_get_status
    description: "Checking Figma connection"
    on_fail: block
    hint: "Open Figma Desktop and ensure the figma-console-mcp plugin is running."
  - type: prompt
    id: figma_url
    message: "Figma DS library URL (the file with your components, tokens, and styles)"
    placeholder: "https://www.figma.com/design/abc123/MyDesignSystem"
    validate: "^https://(www\\.)?figma\\.com/"
    store_as: figma_url
    extract:
      file_key: "figma\\.com/(?:design|file)/([a-zA-Z0-9]+)"
  - type: tool_extract
    id: extract_variables
    tool: figma_get_variables
    description: "Extracting design tokens (variables)"
    output: "registries/variables.json"
  - type: tool_extract
    id: extract_styles
    tool: figma_get_text_styles
    description: "Extracting text styles"
    output: "registries/text-styles.json"
  - type: file_init
    id: init_recipes
    path: "recipes/_index.json"
    template: "{\"version\":1,\"recipes\":[],\"lastUpdated\":\"\"}"
  - type: file_init
    id: init_learnings
    path: "learnings.json"
    template: "{\"meta\":{\"version\":1},\"learnings\":[],\"flags\":[]}"
---


# Design Workflow — v3 (Compiler-Driven)

> Compiler-driven, recipe-accelerated workflow for designers using Claude Code to design in Figma.
> Powered by Figma MCP transport (console or official). See `references/transport-adapter.md`.
> **Conversation** in the user's language. **All generated artifacts** (KB, CSpecs, guides, learnings, recipes, scene graphs) in **English only**.

---

## Philosophy

1. **Compiler-driven** — Claude produces a scene graph JSON; the compiler enforces all Figma API rules
2. **Recipe-accelerated** — Proven layouts are captured as parameterized templates and reused
3. **DS-native** — Every visual element uses design system tokens and components, never hardcoded
4. **CSpec-first** — Structured YAML specs that translate directly to scene graphs
5. **Iterative** — Make, fix, learn, ship
6. **Minimal context** — Only load what is needed for the current action (no bloated reads)

---

## Hard Rules (Non-Negotiable)

<HARD-GATE>
NEVER write raw Figma Plugin API code. All scene graph JSON must pass
through `lib/compiler/compile.js`. The compiler enforces all 26 Figma
API rules automatically.

NEVER use hardcoded primitive values (hex colors, px sizes, rgb, raw font
names). Only semantic DS tokens: `$color/...`, `$spacing/...`, `$text/...`,
`$comp/...`.

NEVER claim "done" or "ready to ship" without all three of:
  (a) compiler ran to completion (exit code 0)
  (b) screenshot taken in this turn
  (c) user confirmation of visual correctness

NEVER read `figma-api-rules.md` — it does not exist here and the compiler
handles every rule it would encode.

NEVER reuse a Figma `nodeId` from a previous session. Node IDs are
session-scoped; always re-search via `figma_search_components` or the
official MCP equivalent.
</HARD-GATE>

### Red Flags — Rationalization → Reality

These thoughts mean STOP. Each row is a real rationalization from real sessions.

| Rationalization | Reality |
|---|---|
| "I'll just hardcode this hex once — it's faster" | Every hardcode breaks DS compliance. Always use a semantic token. |
| "The compiler is overkill for this tiny thing" | The compiler is the only path. No exceptions, including tiny things. |
| "Skip the screenshot, the change is obviously right" | 'Looks right' ≠ 'is right'. Gate B is mandatory. |
| "I remember this nodeId from my last session" | Node IDs are session-scoped. Re-search every time. |
| "I'll read figma-api-rules.md to double-check" | That file is forbidden. The compiler enforces all 26 rules. |
| "The user approved the design, I can skip compile exit check" | Compile exit code 0 is Gate A. Independent of user approval. |
| "I'll use the nodeId from the compiler output directly in a second script" | Raw Plugin API is banned. Route everything through the compiler. |
| "Let me just write a small inline script to fix this one thing" | No inline scripts. Always: edit scene graph → recompile → execute. |

---

## Knowledge Base Location

The knowledge base is project-specific. Resolve its path in this order:
1. If `./bridge-ds/knowledge-base/registries/` exists and contains JSON files -> use `./bridge-ds/knowledge-base/`
2. Else if `./.claude/skills/design-workflow/references/knowledge-base/registries/` exists and contains JSON files -> use that path
3. Else -> knowledge base not found. Suggest running `setup` to extract the DS.

The `specs/` directory is always at `./specs/` (project root), regardless of KB location.
The `learnings.json` is always inside the knowledge base directory.
The `recipes/` directory is always inside the knowledge base directory.

---

## Commands

| Command | Action File | Purpose |
|---------|-------------|---------|
| `make <description>` | `references/actions/make.md` | Spec + generate + verify (unified flow) |
| `fix` | `references/actions/fix.md` | Diff corrections, learn, iterate |
| `done` | `references/actions/done.md` | Archive, recipe extraction, ship |
| `setup` | `references/actions/setup.md` | DS extraction + KB build |
| `status` | *(inline below)* | Show current state |
| `drop` | `references/actions/drop.md` | Abandon with preserved learnings |

---

## Action Router

> **Routing lives in `skills/using-bridge/SKILL.md` (force-loaded at
> SessionStart).** This skill handles the action-layer execution for the
> routes defined there. The action files referenced below are unchanged.

| Action | Action File |
|--------|-------------|
| `make` | `references/actions/make.md` |
| `fix` | `references/actions/fix.md` |
| `done` | `references/actions/done.md` |
| `setup` | `references/actions/setup.md` |
| `drop` | `references/actions/drop.md` |

---

## Context Loading Rules (CRITICAL)

**Load MINIMAL context per action.** Only these references are needed:

| Action | Required references |
|--------|--------------------|
| **make** | `compiler-reference.md` + `transport-adapter.md` + `actions/make.md` |
| **fix** | `transport-adapter.md` + `actions/fix.md` |
| **done** | `actions/done.md` |
| **setup** | `transport-adapter.md` + `actions/setup.md` |
| **drop** | `actions/drop.md` |

**NEVER load `figma-api-rules.md`.** The compiler enforces all 26 rules. Claude's job is to produce valid scene graph JSON, not write raw Figma Plugin API code.

---

## Full Workflow

```
setup (first time only)
  -> Extract DS via Figma MCP transport
  -> Build knowledge base (registries + guides + recipes index)
  |
make <description>
  |
  +-- Phase A: Context (load registry index, learnings, recipes)
  +-- Phase B: Recipe Match (score against index)
  +-- Phase C: CSpec (generate YAML, apply learnings, user validates)
  +-- Phase D: Compile + Execute (JSON scene graph -> compiler -> Figma)
  +-- Phase E: Present (screenshot, report, offer next step)
  |
  +-- Iteration loop:
  |     User describes changes -> modify scene graph -> recompile -> re-execute
  |     User says "I adjusted in Figma" -> fix flow
  |     User says "done" / "ship it" -> done flow
  |
fix
  |
  +-- Re-read Figma state
  +-- Diff snapshot vs current
  +-- Classify: LEARNING (DS token) vs FLAG (hardcoded)
  +-- Save learnings, patch recipes
  +-- Offer: continue or done
  |
done
  |
  +-- Auto-fix if changes detected
  +-- Archive spec
  +-- Recipe extraction (if eligible)
  +-- Update history
```

---

## Two Modes

### Component mode
Design system components (Button, Card, Modal...):
```
make {component} -> fix (optional) -> done
```
CSpec uses `component-cspec.yaml` template. Includes: variants, props API, tokens.

### Screen mode
Full interfaces (dashboard, settings, onboarding...):
```
make {screen}
  -> if new DS components needed:
      make {component} -> done -> back to screen
  -> fix (optional) -> done
```
CSpec uses `screen-cspec.yaml` template. Includes: layout tree, sections, DS components used.

The `make` action auto-detects the mode from context, or asks the user.

---

## Project Structure

```
specs/
  active/          <- Current work (0-1 CSpecs + snapshots)
  backlog/         <- Queued specs
  shipped/         <- Completed & archived
  dropped/         <- Abandoned with learnings
  history.log      <- One-line per design shipped

knowledge-base/
  registries/      <- components.json, variables.json, text-styles.json, icons.json, ...
  guides/          <- tokens/, components/, patterns/, assets/
  recipes/         <- _index.json + individual recipe JSON files
  learnings.json   <- Accumulated design preferences
```

---

## Status Logic (inline)

Detect state by checking:
1. Does the knowledge base exist? (registries/ has JSON files)
2. Does `specs/active/` contain a CSpec?
3. Has a Figma design been generated for it? (snapshot file exists)

| State | Suggestion |
|-------|------------|
| No knowledge base | "Run: `setup` to extract and document your DS" |
| No active CSpec | "Ready. Run: `make <description>`" |
| Active CSpec, no snapshot | "CSpec ready but not yet compiled. Run: `make` to continue" |
| Active CSpec + snapshot | "Design generated. Try it in Figma, then: `fix` or `done`" |
| DS may be outdated | "Run: `setup` to refresh registries from Figma" |

---

## Quality Gates

Full definitions: `references/quality-gates.md` (read before any phase transition).

---

## Non-Negotiable Rules

- ALWAYS read the action file BEFORE executing
- ALWAYS read `compiler-reference.md` before producing any scene graph JSON
- ALWAYS read `transport-adapter.md` before any MCP tool call
- ALWAYS wait for user confirmation before compiling and executing in Figma
- NEVER load `figma-api-rules.md` — the compiler handles all Figma API rules
- NEVER write raw Plugin API scripts manually — always go through the compiler
- NEVER skip CSpec validation or user confirmation

---

## References

| Reference | Path |
|-----------|------|
| Compiler reference | `references/compiler-reference.md` |
| Transport adapter | `references/transport-adapter.md` |
| Quality gates | `references/quality-gates.md` |
| CSpec template (screen) | `references/templates/screen-cspec.yaml` |
| CSpec template (component) | `references/templates/component-cspec.yaml` |
| Recipe system | `references/knowledge-base/recipes/README.md` |

---

## MCP Tools Used

Bridge supports two Figma MCP transports. Tool names vary by transport — see `references/transport-adapter.md` for the full mapping table and adaptation rules.

| Operation | Console transport | Official transport |
|-----------|------------------|--------------------|
| Execute Plugin API code | `figma_execute` | `use_figma` |
| Take screenshot | `figma_take_screenshot` | `get_screenshot` |
| Full DS extraction | `figma_get_design_system_kit` | Composite strategy |
| Get variables | `figma_get_variables` | `get_variable_defs` |
| Get styles | `figma_get_styles` | `search_design_system` |
| Search components | `figma_search_components` | `search_design_system` |
| Connection check | `figma_get_status` | `whoami` |
