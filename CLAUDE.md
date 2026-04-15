# Bridge DS — Claude Code Instructions

Bridge DS is a compiler-driven design workflow that generates Figma designs using MCP. Claude produces declarative JSON scene graphs; the compiler generates correct Figma Plugin API scripts.

## Architecture

```
Claude Code ──CSpec YAML──> Compiler (local) ──Plugin API──> MCP ──> Figma
```

**Key principle:** Claude NEVER writes raw Plugin API code. The compiler enforces all 26 Figma API rules automatically.

## MCP Transports

Two transports, auto-detected. See `skills/design-workflow/references/transport-adapter.md` for full mapping.

| Operation | Console (preferred) | Official (fallback) |
|-----------|-------------------|-------------------|
| Execute code | `figma_execute` | `use_figma` |
| Screenshot | `figma_take_screenshot` | `get_screenshot` |
| DS extraction | `figma_get_design_system_kit` | Composite strategy |
| Variables | `figma_get_variables` | `get_variable_defs` |
| Styles | `figma_get_styles` | `search_design_system` |
| Components | `figma_search_components` | `search_design_system` |
| Connection | `figma_get_status` | `whoami` |

## Commands

The `/design-workflow` skill handles everything:

| Command | Purpose |
|---------|---------|
| `make <description>` | Spec + compile + execute + verify (unified flow) |
| `fix` | Diff corrections, learn, iterate |
| `done` | Archive, recipe extraction, ship |
| `setup` | Extract DS + build knowledge base |
| `status` | Show current state, suggest next |
| `drop` | Abandon with preserved learnings |

Read `skills/design-workflow/SKILL.md` for the full workflow definition.

## Skills

Bridge uses a **multi-skill** Claude Code architecture (v3.3.0+):

- **`skills/using-bridge/`** — Force-loaded via `hooks/session-start` on
  every Claude Code session. Owns the command map, non-negotiable hard
  rules (compiler-only, semantic-tokens-only, verification-before-ship),
  the Red Flags pointer, the inline `drop` procedure, and the inline
  `status` logic. Small (~500 tokens) to keep the fixed per-session
  context cost low.

- **`skills/generating-figma-design/`** — `make` command. CSpec → scene
  graph → compile → execute → verify. Owns the CSpec templates.

- **`skills/learning-from-corrections/`** — `fix` command. Diffs Figma
  state against the last snapshot, classifies corrections, persists
  learnings, patches recipes.

- **`skills/shipping-and-archiving/`** — `done` command. Final Gate B
  verification, archive CSpec, update history, extract recipes.

- **`skills/extracting-design-system/`** — `setup` command. Extracts the
  DS from Figma (interactive MCP path in V3.3.0; headless REST path in
  V4.0.0).

- **`skills/design-workflow/`** — Compatibility shim only. Will be
  removed in V4.0.0.

Shared references live at the repo root under `references/`:
- `compiler-reference.md`
- `transport-adapter.md`
- `verification-gates.md`
- `red-flags-catalog.md`

## Compiler

Invocation:
```bash
node lib/compiler/compile.js --input <json> --kb <kb-path> --transport <console|official>
```

The compiler takes a scene graph JSON with `$token` references and outputs executable code chunks. See `skills/design-workflow/references/compiler-reference.md` for the JSON format.

## Scene Graph (summary)

Claude produces JSON with node types: FRAME, TEXT, INSTANCE, CLONE, RECTANGLE, ELLIPSE, REPEAT, CONDITIONAL. All values use `$token` references (`$spacing/md`, `$color/bg/neutral/default`, `$text/heading/xl`, `$comp/Button`). The compiler resolves tokens against the knowledge base registries.

## Recipe System

Pre-built scene graph templates in `knowledge-base/recipes/` that evolve with user corrections. Recipes are scored against user descriptions and used as starting points when matched.

## Workflow

```
setup (once) → make → [fix cycle] → done
```

`make` = context load + recipe match + CSpec generation + compile + execute + verify. Iteration happens within `make` (describe changes) or via `fix` (manual Figma corrections).

## Knowledge Base

```
knowledge-base/
  registries/      ← components.json, variables.json, text-styles.json, icons.json
  guides/          ← tokens/, components/, patterns/, assets/
  recipes/         ← _index.json + recipe JSON files
  learnings.json   ← Accumulated design preferences
```

## References

| Reference | Path |
|-----------|------|
| Compiler reference | `references/compiler-reference.md` |
| Transport adapter | `references/transport-adapter.md` |
| Verification gates | `references/verification-gates.md` |
| Red Flags catalog | `references/red-flags-catalog.md` |
| CSpec templates | `skills/generating-figma-design/references/templates/` |
