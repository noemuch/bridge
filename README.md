<p align="center">
  <img src="docs/assets/banner-placeholder.png" alt="Bridge" width="600" />
</p>

<p align="center">
  <strong>Compiler-driven design generation for Figma.</strong><br/>
  <em>Auto-maintained docs included. Cron-synced. MCP-native.</em>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://www.npmjs.com/package/@noemuch/bridge-ds"><img src="https://img.shields.io/npm/v/@noemuch/bridge-ds?color=0183ff" alt="npm version" /></a>
  <a href="https://github.com/noemuch/bridge/stargazers"><img src="https://img.shields.io/github/stars/noemuch/bridge?color=0183ff" alt="Stars" /></a>
  <a href="https://github.com/noemuch/bridge/actions"><img src="https://github.com/noemuch/bridge/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
</p>

<div align="center">

[Discussions](https://github.com/noemuch/bridge/discussions) · [Issues](https://github.com/noemuch/bridge/issues) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md)

</div>

<br />

Bridge compiles your design-system intent into correct Figma Plugin API code. No AI hallucinations. No hand-written scripts. 26 Figma API rules enforced automatically by a local compiler.

Bonus: Bridge also auto-maintains your DS documentation in your own repo (no SaaS, no lock-in). The compiler is the moat; the docs pipeline is a feature on top.

## For designers

Design components and screens **from natural language** inside Claude Code. Bridge handles the rest:

```
# In Claude Code, inside your DS repo:
make a settings screen for account information
```

Bridge produces:
1. A structured CSpec (YAML) describing the layout + tokens
2. A scene graph JSON (validated against your DS registries)
3. Compiled Figma Plugin API code (all 26 rules respected)
4. Executed designs in Figma via MCP

Every output uses your real components, bound variables, and text styles. **Zero hardcoded values.**

Iterate with `fix` (capture manual Figma edits as learnings). Ship with `done` (archive + cascade docs).

## For DS teams

Bridge's secondary value: auto-maintained documentation in your repo.

- **`setup bridge`** in Claude Code bootstraps your DS repo: registries, docs tree, cron workflow, all in one flow.
- **Daily cron** on GitHub Actions pulls Figma via REST, detects drift, opens a PR with cascaded doc updates. Silent on no-diff.
- **Preservation layer**: `_manual/` directory and inline `<!-- manual:id -->` regions are never overwritten. Your hand-written content stays.
- **Per-component `.llm.txt`** sidecars for AI-native consumption.
- **Linter** verifies token references, frontmatter schema, Figma deeplinks.

## For engineers

Consume the DS from your IDE — Cursor, Claude Code, Copilot CLI, Codex:

- **`llms.txt`** index (Answer.AI spec) — AI-discoverable catalog.
- **`llms-full.txt`** — concatenated full docs for inline context.
- **`.llm.txt` per component** — ultra-compressed structured entries.
- **MCP server** (`bridge-ds docs mcp`) exposes `ds://component/<name>`, `ds://foundation/<name>`, `ds://index` over stdio.

Point your AI client at the DS repo's `llms.txt` or the MCP server. Your generated code uses tokens, variants, and composition rules correctly — because it's reading the source of truth, not guessing.

## Quick start

**In Claude Code, any session (one-time install):**

```
/plugin marketplace add github:noemuch/bridge
/plugin install bridge-ds
```

**In your DS repo:**

```
cd /path/to/ds-repo && claude
setup bridge
```

One phrase. The skill handles pre-flight, scaffolding, extraction, docs generation, GitHub secret, first commit, and optional cron test. ~10 minutes end-to-end.

**Already on v4.0.0?** See [MIGRATION.md](MIGRATION.md) for the v4.1.0 upgrade path (TL;DR: `npm install @noemuch/bridge-ds@4.1.0`, no other action needed).

---

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

[Compiler reference →](references/compiler-reference.md) · [Transport adapter →](references/transport-adapter.md) · [Verification gates →](references/verification-gates.md)

## Bridge Docs (V0.1)

Bridge auto-generates and maintains your design system's documentation in the same repo:

- `bridge-ds init-docs` — scaffold `design-system/` + `docs.config.yaml` + cron.
- `bridge-ds docs build` — full regeneration from your knowledge base.
- `bridge-ds docs sync` — incremental cascade when Figma drifts.
- `bridge-ds docs check` — lint only.
- `bridge-ds docs mcp` — launch the local MCP server (`ds://` URIs over stdio).
- `bridge-ds doctor` — diagnose config, connectivity, docs health, cron.
- `bridge-ds extract --headless` — Figma REST extraction (CI-friendly, `FIGMA_TOKEN` required).
- Daily cron (`.github/workflows/bridge-docs-cron.yml`) keeps Figma and docs in sync automatically.

See [CHANGELOG.md](CHANGELOG.md) for the full V0.1 feature list.

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
  cli.js
  scaffold.js
  mcp-setup.js
  compiler/                          Scene graph compiler

references/                          Shared, repo-level
  compiler-reference.md
  transport-adapter.md
  verification-gates.md
  red-flags-catalog.md

skills/
  using-bridge/SKILL.md              Force-loaded process skill
  generating-figma-design/SKILL.md   make
  learning-from-corrections/SKILL.md fix
  shipping-and-archiving/SKILL.md    done
  extracting-design-system/SKILL.md  setup
  design-workflow/SKILL.md           Compatibility shim (removed in v4.0.0)

hooks/
  session-start
  hooks.json

scripts/
  validate-skills.js                 Skill/reference validation harness

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
