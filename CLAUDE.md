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

Bridge uses a **two-layer** Claude Code skill architecture:

- **`skills/using-bridge/`** — Force-loaded via `hooks/session-start` on
  every Claude Code session. Owns the command map, non-negotiable hard
  rules (compiler-only, semantic-tokens-only, verification-before-ship),
  and the Red Flags rationalization catalog. Small (~400 tokens) to
  keep the fixed per-session context cost low.

- **`skills/design-workflow/`** — Action layer. Executes the workflows
  (`make`, `fix`, `done`, `setup`, `drop`) through its `references/actions/*.md`
  files. Will be split into five focused action skills in v4.0.0 (see the
  Bridge Docs + restructure spec in `docs/superpowers/specs/`).

The SessionStart hook script at `hooks/session-start` reads
`skills/using-bridge/SKILL.md`, strips YAML frontmatter, and emits the
Claude Code hook JSON payload. Registered in `hooks/hooks.json`.

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
| Compiler reference | `skills/design-workflow/references/compiler-reference.md` |
| Transport adapter | `skills/design-workflow/references/transport-adapter.md` |
| Quality gates | `skills/design-workflow/references/quality-gates.md` |
| CSpec templates | `skills/design-workflow/references/templates/` |
