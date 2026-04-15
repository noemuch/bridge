<p align="center">
  <!-- TODO: Replace with actual Bridge banner/logo -->
  <img src="docs/assets/banner-placeholder.png" alt="Bridge" width="600" />
</p>

<p align="center">
  <strong>Compiler-driven design generation for Figma. Zero hardcoded values.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://www.npmjs.com/package/@noemuch/bridge-ds"><img src="https://img.shields.io/npm/v/@noemuch/bridge-ds?color=0183ff" alt="npm version" /></a>
  <a href="https://github.com/noemuch/bridge/stargazers"><img src="https://img.shields.io/github/stars/noemuch/bridge?color=0183ff" alt="Stars" /></a>
  <a href="https://github.com/noemuch/bridge/actions"><img src="https://github.com/noemuch/bridge/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="#"><img src="https://img.shields.io/badge/figma--api--rules-26%2F26-success" alt="26/26 Figma API rules enforced" /></a>
</p>

<div align="center">

[Discussions](https://github.com/noemuch/bridge/discussions) · [Issues](https://github.com/noemuch/bridge/issues) · [Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md)

</div>

<br />

<!-- TODO: Replace with actual GIF/screenshot of Bridge generating a screen in Figma -->
<p align="center">
  <img src="docs/assets/demo-placeholder.png" alt="Bridge generating a Figma screen from a description" width="800" />
</p>

## What is Bridge?

Bridge turns Claude Code into a designer that knows your design system inside out. You describe a component or a screen in natural language — Bridge consults your documented DS, writes a structured CSpec, compiles it into a scene graph, and executes it in Figma via MCP.

No raw Figma Plugin API scripting. No hardcoded hex codes or magic pixels. Every output uses your real components, bound variables, and text styles. The compiler is the single enforcement path: 26 Figma API rules, token resolution, validation, code generation, transport adaptation — all automatic.

## Key Features

- **Scene Graph Compiler** — The LLM produces declarative JSON with `$token` references. A local compiler (`lib/compiler/compile.js`) resolves tokens, validates structure, enforces all 26 Figma Plugin API rules, and generates correct executable code. Claude never writes raw Plugin API scripts.

- **CSpec — Compilable Specifications** — Structured YAML that describes what to build: layout tree, components, tokens, variants. Human-readable, machine-parseable. Templates exist for screens and components.

- **Recipe System** — Proven layouts captured as parameterized scene graph templates. High-scoring recipes pre-fill the CSpec, accelerating generation. Recipes evolve: `fix` and `done` flows extract learnings and patch recipes from user corrections.

- **Fix Loop** — "I adjusted it in Figma" triggers a snapshot diff. Corrections are classified (DS token vs. hardcoded flag), persisted as learnings, and used to auto-patch recipes. The DS knowledge deepens with every iteration.

- **Dual MCP Transport** — Supports [figma-console-mcp](https://github.com/southleft/figma-console-mcp) (preferred, full capabilities via Figma Desktop plugin) and the official Figma MCP server (simpler, cloud-based). Auto-detection picks the best available transport.

## Architecture

| Layer | Technology | Description |
|-------|-----------|-------------|
| **Workflow** | Claude Code Skills | Two-layer skill (`using-bridge` process + `design-workflow` actions) |
| **Spec** | CSpec YAML | Structured, human-readable compilable specifications |
| **Compiler** | Node.js | Scene graph JSON → Figma Plugin API code (26 rules enforced) |
| **Transport** | MCP | `figma-console-mcp` (preferred) or official Figma MCP server |
| **Target** | Figma Desktop / Cloud | Production-ready designs in your real DS library |
| **Memory** | Knowledge Base | Registries, guides, recipes, learnings — per-project |

```
You describe → Claude writes CSpec → Compiler resolves tokens → MCP → Figma
```

## Quick Start

```bash
# 1. Install figma-console-mcp (recommended transport)
claude mcp add figma-console -s user \
  -e FIGMA_ACCESS_TOKEN=figd_YOUR_TOKEN \
  -- npx -y figma-console-mcp@latest

# 2. Connect Figma Desktop plugin
npx figma-console-mcp@latest --print-path
# Then in Figma Desktop: Plugins > Development > Import plugin from manifest...
# Select the manifest.json inside the printed directory.

# 3. Initialize your project
cd your-project
npx @noemuch/bridge-ds init

# 4. Extract your DS (first-time only)
# In Claude Code:
/design-workflow setup

# 5. Start designing
/design-workflow make a settings page for account information
```

Full prerequisites: [Claude Code](https://claude.ai/download), [Node.js 18+](https://nodejs.org), a Figma file with a published DS library.

## Build Your Own Recipe

Recipes are parameterized scene graph templates that the compiler can reuse across sessions. The fastest way to create one: generate a screen with `make`, then `done` to archive it — Bridge auto-extracts a recipe when the layout is reusable.

Manually:

```bash
# Recipes live in: knowledge-base/recipes/
# Schema: { id, name, archetype, tags, scene_graph, confidence }
```

Each recipe gets scored against the user's description on four axes: archetype match, tag overlap, structural similarity, and confidence. High-scoring recipes pre-fill the CSpec and shortcut the generation flow.

See [`skills/design-workflow/references/knowledge-base/recipes/README.md`](skills/design-workflow/references/knowledge-base/recipes/README.md) for the full schema.

## The Compiler

The compiler is the single enforcement path. Every scene graph JSON goes through a deterministic pipeline:

```bash
node lib/compiler/compile.js --input scene.json --kb <kb-path> --transport <console|official>
```

| Stage | Purpose |
|-------|---------|
| **Parse** | Load scene graph JSON, validate schema |
| **Resolve** | Look up every `$token` reference against the knowledge base registries (variables, components, text styles, icons) |
| **Validate** | Check structure, detect missing tokens with fuzzy suggestions, flag hardcoded values |
| **Plan** | Chunk large graphs for transport limits; bridge nodeIds across chunks |
| **Generate** | Emit Figma Plugin API code that respects all 26 rules (FILL after appendChild, resize before sizing, setBoundVariableForPaint, async component imports, …) |
| **Wrap** | Adapt output for the target transport (console IIFE vs. official top-level await) |

Errors are caught at compile time, before anything touches Figma. The 26 rules — the ones that would trip up hand-written Plugin API scripts — are enforced by code generation, not by memory.

[Compiler reference →](skills/design-workflow/references/compiler-reference.md) · [Transport adapter →](skills/design-workflow/references/transport-adapter.md) · [Quality gates →](skills/design-workflow/references/quality-gates.md)

## Commands

| Command | Purpose |
|---------|---------|
| `/design-workflow make <description>` | Spec + compile + execute + verify (unified flow) |
| `/design-workflow fix` | Diff Figma corrections, extract learnings, iterate |
| `/design-workflow done` | Archive spec, extract recipes, ship |
| `/design-workflow setup` | Extract DS + build knowledge base |
| `/design-workflow status` | Show current state, suggest next action |
| `/design-workflow drop` | Abandon with preserved learnings |

## Project Structure

```
bin/                                 CLI entry point
lib/
  cli.js                             init / update / help / version
  scaffold.js                        Project scaffolding
  mcp-setup.js                       Transport detection + setup
  compiler/                          Scene graph compiler
    compile.js                       Entry point
    resolve.js                       Token resolution
    validate.js                      Schema + structural validation
    plan.js                          Chunk planning
    codegen.js                       Plugin API code generation
    wrap.js                          Transport-aware wrapping
    schema.js                        Scene graph schema
    SPEC.md                          Compiler specification

skills/
  using-bridge/SKILL.md              Force-loaded process-layer skill (~400 tokens)
  design-workflow/                   Action-layer skill
    SKILL.md                         Workflow definition
    references/
      actions/                       make / fix / done / setup / drop
      templates/                     CSpec YAML templates
      knowledge-base/                Schemas + KB README

hooks/
  session-start                      POSIX script: injects using-bridge at SessionStart
  hooks.json                         Claude Code hook registration

.claude-plugin/                      Claude Code plugin manifest
.cursor-plugin/                      Cursor plugin manifest
```

## Plugin Support

Bridge DS works as a plugin for:

- **Claude Code** — Native skill via `.claude/skills/` and SessionStart hook injection.
- **Cursor** — Plugin via `.cursor-plugin/`.

Both use the same MCP transport and compiler infrastructure.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code guidelines, and PR process.

## License

[MIT](LICENSE)

---

<p align="center">
  Built by <a href="https://www.linkedin.com/in/noechague/">Noé Chagué</a> — Design System <a href="https://finary.com">@Finary</a>
</p>
