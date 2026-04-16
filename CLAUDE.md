# Bridge DS — Claude Code Instructions

Bridge DS is a compiler-driven design workflow that generates Figma designs using MCP. Claude produces declarative JSON scene graphs; the compiler generates correct Figma Plugin API scripts.

## Architecture

```
Claude Code ──CSpec YAML──> Compiler (local) ──Plugin API──> MCP ──> Figma
```

**Key principle:** Claude NEVER writes raw Plugin API code. The compiler enforces all 26 Figma API rules automatically.

## MCP transports

Two transports, auto-detected. See `references/transport-adapter.md` for full mapping.

| Operation     | Console (preferred)           | Official (fallback)    |
| ------------- | ----------------------------- | ---------------------- |
| Execute code  | `figma_execute`               | `use_figma`            |
| Screenshot    | `figma_take_screenshot`       | `get_screenshot`       |
| DS extraction | `figma_get_design_system_kit` | Composite strategy     |
| Variables     | `figma_get_variables`         | `get_variable_defs`    |
| Styles        | `figma_get_styles`            | `search_design_system` |
| Components    | `figma_search_components`     | `search_design_system` |
| Connection    | `figma_get_status`            | `whoami`               |

## Skills (v5.0.0+)

Bridge uses a **multi-skill** Claude Code architecture. There is no `/design-workflow` slash command — commands are triggered by keywords routed through `using-bridge` (see the command map in that skill).

| Skill                       | Trigger keyword             | Purpose                                                       |
| --------------------------- | --------------------------- | ------------------------------------------------------------- |
| `using-bridge`              | SessionStart (force-loaded) | Command map, hard rules, drop/status procedures (~500 tokens) |
| `generating-figma-design`   | `make <description>`        | CSpec → scene graph → compile → execute → verify              |
| `learning-from-corrections` | `fix`                       | Diff Figma corrections, extract learnings, patch recipes      |
| `shipping-and-archiving`    | `done`                      | Final Gate B verification, archive CSpec, extract recipes     |
| `extracting-design-system`  | `setup bridge`              | Extract DS from Figma, scaffold repo, wire up cron            |
| `generating-ds-docs`        | `docs`                      | 6 modes (init, full-build, sync, check, mcp, headless-sync)   |

Shared references live at the repo root under `references/`:

- `compiler-reference.md`
- `transport-adapter.md`
- `verification-gates.md`
- `red-flags-catalog.md`

## Compiler

The compiler is TypeScript (v5.0.0+, previously JS). Invocation:

```bash
bridge-ds compile --input <json> --kb <kb-path> --transport <console|official>
```

Or programmatically: `import { compile } from "@noemuch/bridge-ds/compiler"`.

The compiler takes a scene graph JSON with `$token` references and outputs executable code chunks. See `references/compiler-reference.md` for the JSON format.

## Scene graph (summary)

Claude produces JSON with node types: FRAME, TEXT, INSTANCE, CLONE, RECTANGLE, ELLIPSE, REPEAT, CONDITIONAL. All values use `$token` references (`$spacing/md`, `$color/bg/neutral/default`, `$text/heading/xl`, `$comp/Button`). The compiler resolves tokens against the knowledge base registries.

## Recipe system

Pre-built scene graph templates in `knowledge-base/recipes/` that evolve with user corrections. Recipes are scored against user descriptions and used as starting points when matched.

## Workflow

```
setup bridge (once) → make → [fix cycle] → done
```

`make` = context load + recipe match + CSpec generation + compile + execute + verify. Iteration happens within `make` (describe changes) or via `fix` (manual Figma corrections).

## Knowledge base layout

```
bridge-ds/knowledge-base/
  registries/      ← components.json, variables.json, text-styles.json, icons.json
  guides/          ← tokens/, components/, patterns/, assets/
  recipes/         ← _index.json + recipe JSON files
  learnings.json   ← Accumulated design preferences
```

## References

| Reference          | Path                                                   |
| ------------------ | ------------------------------------------------------ |
| Compiler reference | `references/compiler-reference.md`                     |
| Transport adapter  | `references/transport-adapter.md`                      |
| Verification gates | `references/verification-gates.md`                     |
| Red Flags catalog  | `references/red-flags-catalog.md`                      |
| CSpec templates    | `skills/generating-figma-design/references/templates/` |
