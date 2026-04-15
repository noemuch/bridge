# Bridge DS

Compiler-driven design generation for Figma — 100% design system compliant.

Bridge turns [Claude Code](https://claude.ai/download) into a designer that knows your design system inside out. Instead of writing raw Figma Plugin API scripts, Claude produces declarative scene graph JSON with token references. A local compiler resolves tokens, validates structure, enforces all Figma API rules, and generates correct executable code — then executes it in Figma via MCP.

The result: production-ready Figma designs that use your real components, bound variables, and text styles. Zero hardcoded values.

## Architecture

```
You describe what you want
  → Claude consults the knowledge base (your DS, documented)
  → Claude writes a CSpec (structured YAML specification)
  → Claude converts CSpec to a scene graph JSON
  → Compiler resolves tokens, validates, generates code
  → Code executes in Figma via MCP
  → You review, iterate, ship
```

```
Claude Code ──CSpec YAML──> Scene Graph JSON ──> Compiler ──Plugin API──> MCP ──> Figma
```

Bridge supports two MCP transports:

```
Claude Code  ──MCP──>  figma-console-mcp  ──WebSocket──>  Figma Desktop  (preferred)
Claude Code  ──MCP──>  Figma MCP Server   ──Cloud──>      Figma Cloud    (official, fallback)
```

Auto-detection picks the best available transport. See [transport-adapter.md](skills/design-workflow/references/transport-adapter.md) for details.

## Prerequisites

- [Claude Code](https://claude.ai/download) installed
- [Node.js 18+](https://nodejs.org)
- A Figma file with a published design system library
- One of:
  - [figma-console-mcp](https://github.com/southleft/figma-console-mcp) + [Figma Desktop](https://www.figma.com/downloads/) (recommended, full capabilities)
  - Official Figma MCP server (simpler setup, cloud-based)

## Quick Start

### 1. Install figma-console-mcp

```bash
claude mcp add figma-console -s user \
  -e FIGMA_ACCESS_TOKEN=figd_YOUR_TOKEN \
  -- npx -y figma-console-mcp@latest
```

Get your token from [Figma Settings > Personal access tokens](https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens).

### 2. Connect Figma Desktop

1. Run `npx figma-console-mcp@latest --print-path` to find the plugin directory
2. In Figma Desktop: **Plugins > Development > Import plugin from manifest...**
3. Select `figma-desktop-bridge/manifest.json`
4. Run the plugin in your Figma file

### 3. Initialize your project

```bash
cd your-project
npx @noemuch/bridge-ds init
```

This scaffolds:
- `.claude/skills/design-workflow/` — the workflow skill + references + compiler
- `.claude/commands/design-workflow.md` — the `/design-workflow` slash command
- `specs/` — directory for active, shipped, and dropped specs

### 4. Build your knowledge base

Open Claude Code in your project:

```
/design-workflow setup
```

Claude will extract your entire DS from Figma, analyze every component, token, and style, and generate intelligent guides and a recipe index.

### 5. Start designing

```
/design-workflow make a settings page for account information
```

Claude consults the knowledge base, matches recipes, generates a CSpec, compiles it to a scene graph, and executes it in Figma. Then:

```
- Describe changes -> Claude modifies and recompiles
- "I adjusted in Figma" -> triggers fix flow (diff + learn)
- "done" / "ship it" -> triggers done flow (archive + recipe extraction)
```

## Commands

| Command | Purpose |
|---------|---------|
| `/design-workflow make <description>` | Spec + compile + execute + verify (unified flow) |
| `/design-workflow fix` | Diff Figma corrections, extract learnings, iterate |
| `/design-workflow done` | Archive spec, extract recipes, ship |
| `/design-workflow setup` | Extract DS + build knowledge base |
| `/design-workflow status` | Show current state, suggest next action |
| `/design-workflow drop` | Abandon with preserved learnings |

## Skills

Bridge uses a **two-layer** Claude Code skill architecture:

- **Two-layer skill architecture**: a small force-loaded `using-bridge`
  skill sets discipline + command map at SessionStart; `design-workflow`
  executes the action layer (`make` / `fix` / `done` / `setup` / `drop`).
  See `CLAUDE.md` for details.

## How It Works

### CSpec (Compilable Specification)

A structured YAML format that describes what to build: layout tree, components, tokens, variants. Human-readable and machine-parseable. Templates exist for screens and components.

### Scene Graph Compiler

The compiler (`lib/compiler/compile.js`) takes a declarative JSON scene graph with `$token` references and produces correct Figma Plugin API code:

```bash
node lib/compiler/compile.js --input scene.json --kb <kb-path> --transport <console|official>
```

Pipeline: `Parse > Resolve tokens > Validate structure > Plan chunks > Generate code > Wrap for transport`

The compiler enforces all 26 Figma API rules automatically (FILL after appendChild, resize before sizing, setBoundVariableForPaint, etc.). Claude never needs to remember them.

### Recipe System

Recipes are pre-built scene graph templates stored in `knowledge-base/recipes/`. When a user requests a design, recipes are scored by archetype match, tag overlap, structural similarity, and confidence. High-scoring recipes pre-fill the CSpec, accelerating generation.

Recipes evolve: the `fix` and `done` flows extract learnings and patch recipes based on user corrections.

### Knowledge Base

```
knowledge-base/
  registries/      <- components.json, variables.json, text-styles.json, icons.json
  guides/          <- tokens/, components/, patterns/, assets/
  recipes/         <- _index.json + individual recipe JSON files
  learnings.json   <- Accumulated design preferences
```

## v3.0 Highlights

v3.0 is a complete architecture rewrite. Key changes from v2:

- **Compiler-driven**: Claude produces scene graphs, the compiler writes Plugin API code. No more manual scripting.
- **Unified `make` command**: Replaces the old `spec > design > review` cycle with a single continuous flow.
- **CSpec format**: YAML-based compilable specs replace markdown templates.
- **Recipe system**: Proven layouts captured as parameterized templates, reused and improved over time.
- **`fix` command**: Snapshot diffing, learning extraction, recipe auto-patching.
- **Compile-time validation**: Errors caught before Figma execution, with fuzzy suggestions.
- **Removed**: `figma-api-rules.md`, `bundle.js`, old action files (`spec.md`, `design.md`, `review.md`, `quick.md`, `sync.md`, `learn.md`).

See [CHANGELOG.md](CHANGELOG.md) for the full list.

## Plugin Support

Bridge DS works as a plugin for:

- **Claude Code** — Native skill via `.claude/skills/`
- **Cursor** — Plugin via `.cursor-plugin/`

Both use the same MCP transport and compiler infrastructure.

## Author

Built by [Noe Chague](https://github.com/noemuch).

## License

MIT
