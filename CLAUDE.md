# Bridge DS — Claude Code Instructions

## Mission

Bridge is a **deterministic compiler** that turns AI-generated design intent into Figma output **guaranteed DS-compliant by construction, not by verification**.

Bridge is to Figma what a type-checker is to code: the layer that catches errors at the door, not in production.

## The 3 pillars

Everything Bridge does must serve one of these. Anything else is candidate for cut.

1. **Compiler-enforced correctness** — 26 Figma API rules + 100% DS token compliance, deterministic
2. **Conversational UX via Claude Code skills** — `make` / `fix` / `done` workflow
3. **Living KB synchronized with Figma** — registries refreshed via cron, drift-aware

## Design principle: subtraction by default

> The Bridge codebase should be smaller in 6 months, not larger.

Subtraction is the default. Every subsystem must justify its existence against the 3 pillars or die. When in doubt, cut. Adding code is a hypothesis; the burden of proof is on the addition.

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
